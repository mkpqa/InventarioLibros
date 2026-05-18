const pool = require('../db/pool');

// ─────────────────────────────────────────────────────────────────────────────
// Genera el siguiente número de venta correlativo: VTA-0001, VTA-0002...
// Debe ejecutarse DENTRO de una transacción con el mismo `client`.
// ─────────────────────────────────────────────────────────────────────────────
async function generarNumeroVenta(client) {
  // Bloqueamos la tabla para evitar número duplicado en concurrencia
  const result = await client.query(
    `SELECT numero_venta
     FROM ventas
     ORDER BY id DESC
     LIMIT 1
     FOR UPDATE`
  );

  if (result.rows.length === 0) {
    return 'VTA-0001';
  }

  const ultimo = result.rows[0].numero_venta; // e.g. 'VTA-0042'
  const num    = parseInt(ultimo.split('-')[1], 10) + 1;
  return `VTA-${String(num).padStart(4, '0')}`;
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/ventas
// Registra una venta con múltiples libros. Transacción atómica completa.
// Acceso: Admin y Operario
// ─────────────────────────────────────────────────────────────────────────────
async function registrarVenta(req, res) {
  const { cliente_nombre, precio_total, items } = req.body;

  // Validaciones básicas
  if (!items || !Array.isArray(items) || items.length === 0) {
    return res.status(400).json({ error: 'Debes incluir al menos 1 libro en la venta' });
  }

  for (const item of items) {
    if (!item.libro_id || !item.cantidad || parseInt(item.cantidad, 10) < 1) {
      return res.status(400).json({ error: 'Cada item debe tener libro_id y cantidad >= 1' });
    }
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // ── 1. Generar número de venta ──────────────────────────────
    const numeroVenta = await generarNumeroVenta(client);

    // ── 2. INSERT en ventas ─────────────────────────────────────
    const ventaResult = await client.query(
      `INSERT INTO ventas (numero_venta, cliente_nombre, precio_total, usuario_id)
       VALUES ($1, $2, $3, $4)
       RETURNING id, numero_venta`,
      [
        numeroVenta,
        cliente_nombre?.trim() || null,
        precio_total ? parseFloat(precio_total) : null,
        req.usuario.id,
      ]
    );

    const venta = ventaResult.rows[0];

    // ── 3. Procesar cada item de la venta ───────────────────────
    for (const item of items) {
      const libroId  = parseInt(item.libro_id, 10);
      const cantidad = parseInt(item.cantidad, 10);

      // 3a. Bloquear fila y verificar stock (FOR UPDATE previene race conditions)
      const libroResult = await client.query(
        `SELECT id, titulo, stock_actual
         FROM libros
         WHERE id = $1 AND estado_activo = TRUE
         FOR UPDATE`,
        [libroId]
      );

      if (libroResult.rows.length === 0) {
        await client.query('ROLLBACK');
        return res.status(404).json({ error: `Libro ID ${libroId} no encontrado o inactivo` });
      }

      const libro = libroResult.rows[0];

      // 3b. Verificar stock suficiente
      if (libro.stock_actual < cantidad) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: `Stock insuficiente para: "${libro.titulo}". Disponible: ${libro.stock_actual}, solicitado: ${cantidad}`,
        });
      }

      const saldoAnterior   = libro.stock_actual;
      const saldoResultante = saldoAnterior - cantidad;

      // 3c. Actualizar stock del libro
      await client.query(
        `UPDATE libros
         SET stock_actual = $1, actualizado_en = NOW()
         WHERE id = $2`,
        [saldoResultante, libroId]
      );

      // 3d. Registrar en kardex con venta_id
      await client.query(
        `INSERT INTO kardex
           (libro_id, usuario_id, tipo_movimiento, cantidad,
            saldo_anterior, saldo_resultante, observacion, venta_id)
         VALUES ($1, $2, 'SALIDA', $3, $4, $5, $6, $7)`,
        [
          libroId,
          req.usuario.id,
          cantidad,
          saldoAnterior,
          saldoResultante,
          `Venta ${numeroVenta}`,
          venta.id,
        ]
      );

      // 3e. INSERT en detalle_ventas
      await client.query(
        `INSERT INTO detalle_ventas (venta_id, libro_id, cantidad)
         VALUES ($1, $2, $3)`,
        [venta.id, libroId, cantidad]
      );
    }

    // ── 4. COMMIT ───────────────────────────────────────────────
    await client.query('COMMIT');

    return res.status(201).json({
      venta_id:     venta.id,
      numero_venta: venta.numero_venta,
      mensaje:      'Venta registrada correctamente',
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registrarVenta:', err);
    return res.status(500).json({ error: 'Error interno al registrar la venta' });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ventas
// Lista todas las ventas con número de items y nombre del usuario.
// Acceso: Admin y Operario
// ─────────────────────────────────────────────────────────────────────────────
async function getVentas(req, res) {
  try {
    const result = await pool.query(
      `SELECT
         v.id,
         v.numero_venta,
         v.cliente_nombre,
         v.precio_total,
         v.creado_en,
         u.nombre  AS usuario_nombre,
         COUNT(dv.id)::int AS total_items,
         SUM(dv.cantidad)::int AS total_libros
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
       LEFT JOIN detalle_ventas dv ON dv.venta_id = v.id
       GROUP BY v.id, u.nombre
       ORDER BY v.creado_en DESC
       LIMIT 200`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en getVentas:', err);
    return res.status(500).json({ error: 'Error al obtener ventas' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/ventas/:id
// Detalle completo de una venta con todos sus items.
// Acceso: Admin y Operario
// ─────────────────────────────────────────────────────────────────────────────
async function getVentaById(req, res) {
  const { id } = req.params;

  try {
    // Cabecera de la venta
    const ventaResult = await pool.query(
      `SELECT v.*, u.nombre AS usuario_nombre
       FROM ventas v
       JOIN usuarios u ON u.id = v.usuario_id
       WHERE v.id = $1`,
      [id]
    );

    if (ventaResult.rows.length === 0) {
      return res.status(404).json({ error: 'Venta no encontrada' });
    }

    // Items del detalle
    const itemsResult = await pool.query(
      `SELECT dv.id, dv.cantidad, l.titulo, l.codigo_barras, l.foto_url
       FROM detalle_ventas dv
       JOIN libros l ON l.id = dv.libro_id
       WHERE dv.venta_id = $1
       ORDER BY dv.id ASC`,
      [id]
    );

    return res.json({
      ...ventaResult.rows[0],
      items: itemsResult.rows,
    });
  } catch (err) {
    console.error('Error en getVentaById:', err);
    return res.status(500).json({ error: 'Error al obtener la venta' });
  }
}

module.exports = { registrarVenta, getVentas, getVentaById };
