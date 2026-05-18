const pool = require('../db/pool');

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/movimientos
// Registra una ENTRADA o SALIDA de libros.
// Opera dentro de una transacción SQL para garantizar consistencia.
// Acceso: Admin y Operario
// ─────────────────────────────────────────────────────────────────────────────
async function registrarMovimiento(req, res) {
  const { codigo_barras, tipo, cantidad, observacion } = req.body;

  // Validaciones iniciales
  if (!codigo_barras || !tipo) {
    return res.status(400).json({ error: 'codigo_barras y tipo son requeridos' });
  }

  if (!['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser ENTRADA, SALIDA o AJUSTE' });
  }

  const cantidadNum = parseInt(cantidad, 10);
  if (!cantidadNum || cantidadNum < 1) {
    return res.status(400).json({ error: 'cantidad debe ser un número entero >= 1' });
  }

  const client = await pool.connect();
  try {
    // ── 1. Iniciar transacción ─────────────────────────────────
    await client.query('BEGIN');

    // ── 2. Buscar libro con bloqueo de fila (FOR UPDATE) ────────
    // FOR UPDATE previene race conditions si dos usuarios escanean
    // el mismo libro simultáneamente.
    const libroResult = await client.query(
      `SELECT id, titulo, foto_url, stock_actual, estado_activo
       FROM libros
       WHERE codigo_barras = $1
       FOR UPDATE`,
      [codigo_barras.trim()]
    );

    if (libroResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Libro no encontrado' });
    }

    const libro = libroResult.rows[0];

    if (!libro.estado_activo) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Libro inactivo en el sistema' });
    }

    const saldoAnterior = libro.stock_actual;

    // ── 3. Verificar stock para salidas ──────────────────────────
    if (tipo === 'SALIDA' && saldoAnterior < cantidadNum) {
      await client.query('ROLLBACK');
      return res.status(400).json({
        error: 'Stock insuficiente',
        stock_disponible: saldoAnterior,
      });
    }

    // ── 4. Calcular nuevo saldo ───────────────────────────────────
    let saldoResultante;
    if (tipo === 'ENTRADA') {
      saldoResultante = saldoAnterior + cantidadNum;
    } else if (tipo === 'SALIDA') {
      saldoResultante = saldoAnterior - cantidadNum;
    } else {
      // AJUSTE: la cantidad enviada es el nuevo stock absoluto
      // En esta fase el ajuste no se usa en el UI, pero el backend lo soporta
      saldoResultante = cantidadNum;
    }

    // ── 5. Actualizar stock del libro ─────────────────────────────
    await client.query(
      `UPDATE libros
       SET stock_actual = $1, actualizado_en = NOW()
       WHERE id = $2`,
      [saldoResultante, libro.id]
    );

    // ── 6. Insertar registro inmutable en kardex ──────────────────
    const kardexResult = await client.query(
      `INSERT INTO kardex
         (libro_id, usuario_id, tipo_movimiento, cantidad, saldo_anterior, saldo_resultante, observacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        libro.id,
        req.usuario.id,
        tipo,
        cantidadNum,
        saldoAnterior,
        saldoResultante,
        observacion || null,
      ]
    );

    // ── 7. Commit ─────────────────────────────────────────────────
    await client.query('COMMIT');

    // ── 8. Respuesta con datos del libro y kardex_id ──────────────
    return res.status(200).json({
      libro: {
        id: libro.id,
        titulo: libro.titulo,
        foto_url: libro.foto_url,
        stock_anterior: saldoAnterior,
        stock_nuevo: saldoResultante,
      },
      kardex_id: kardexResult.rows[0].id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en registrarMovimiento:', err);
    return res.status(500).json({ error: 'Error al registrar el movimiento' });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/movimientos
// Lista el kardex con filtros opcionales y paginación.
// Acceso: Solo Admin
// ─────────────────────────────────────────────────────────────────────────────
async function getMovimientos(req, res) {
  const {
    desde,
    hasta,
    libro_id,
    tipo,
    page  = 1,
    limit = 100,
  } = req.query;

  const conditions = [];
  const params     = [];
  let   paramIdx   = 1;

  if (desde) {
    conditions.push(`k.creado_en >= $${paramIdx++}`);
    params.push(desde);
  }
  if (hasta) {
    // Incluir todo el día "hasta"
    conditions.push(`k.creado_en < ($${paramIdx++}::date + INTERVAL '1 day')`);
    params.push(hasta);
  }
  if (libro_id) {
    conditions.push(`k.libro_id = $${paramIdx++}`);
    params.push(parseInt(libro_id, 10));
  }
  if (tipo && ['ENTRADA', 'SALIDA', 'AJUSTE'].includes(tipo)) {
    conditions.push(`k.tipo_movimiento = $${paramIdx++}`);
    params.push(tipo);
  }

  const whereClause = conditions.length > 0 ? `WHERE ${conditions.join(' AND ')}` : '';

  // Paginación
  const limitNum  = Math.min(parseInt(limit, 10) || 100, 100);
  const offsetNum = (parseInt(page, 10) - 1) * limitNum;

  try {
    // Total de registros con filtros
    const countResult = await pool.query(
      `SELECT COUNT(*) FROM kardex k
       JOIN libros   l ON l.id = k.libro_id
       JOIN usuarios u ON u.id = k.usuario_id
       ${whereClause}`,
      params
    );
    const total = parseInt(countResult.rows[0].count, 10);

    // Datos paginados — incluye venta_id y numero_venta para Trazabilidad
    const dataResult = await pool.query(
      `SELECT
         k.id,
         k.creado_en,
         l.codigo_barras,
         l.titulo,
         k.tipo_movimiento,
         k.cantidad,
         k.saldo_anterior,
         k.saldo_resultante,
         u.nombre AS usuario_nombre,
         k.observacion,
         k.venta_id,
         v.numero_venta
       FROM kardex k
       JOIN libros   l ON l.id = k.libro_id
       JOIN usuarios u ON u.id = k.usuario_id
       LEFT JOIN ventas v ON v.id = k.venta_id
       ${whereClause}
       ORDER BY k.creado_en DESC
       LIMIT $${paramIdx++} OFFSET $${paramIdx++}`,
      [...params, limitNum, offsetNum]
    );

    return res.json({
      total,
      page: parseInt(page, 10),
      limit: limitNum,
      data: dataResult.rows,
    });
  } catch (err) {
    console.error('Error en getMovimientos:', err);
    return res.status(500).json({ error: 'Error al obtener movimientos' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/movimientos/ajuste
// Ajuste manual de stock desde la pantalla Editar Producto.
// tipo: 'ENTRADA' (suma) | 'AJUSTE' (resta, diferencia de una venta)
// Acceso: Solo Admin
// ─────────────────────────────────────────────────────────────────────────────
async function ajustarStock(req, res) {
  const { libro_id, tipo, cantidad, observacion } = req.body;

  if (!libro_id || !tipo || !cantidad) {
    return res.status(400).json({ error: 'libro_id, tipo y cantidad son requeridos' });
  }

  if (!['ENTRADA', 'AJUSTE'].includes(tipo)) {
    return res.status(400).json({ error: 'tipo debe ser ENTRADA o AJUSTE' });
  }

  const cantidadNum = parseInt(cantidad, 10);
  if (isNaN(cantidadNum) || cantidadNum < 1) {
    return res.status(400).json({ error: 'cantidad debe ser un entero >= 1' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    const libroResult = await client.query(
      `SELECT id, titulo, stock_actual FROM libros
       WHERE id = $1 AND estado_activo = TRUE
       FOR UPDATE`,
      [libro_id]
    );

    if (libroResult.rows.length === 0) {
      await client.query('ROLLBACK');
      return res.status(404).json({ error: 'Libro no encontrado o inactivo' });
    }

    const libro = libroResult.rows[0];
    const saldoAnterior = libro.stock_actual;
    let saldoResultante;

    if (tipo === 'ENTRADA') {
      saldoResultante = saldoAnterior + cantidadNum;
    } else {
      // AJUSTE = resta manual
      if (saldoAnterior < cantidadNum) {
        await client.query('ROLLBACK');
        return res.status(400).json({
          error: 'Stock insuficiente',
          stock_disponible: saldoAnterior,
        });
      }
      saldoResultante = saldoAnterior - cantidadNum;
    }

    await client.query(
      `UPDATE libros SET stock_actual = $1, actualizado_en = NOW() WHERE id = $2`,
      [saldoResultante, libro_id]
    );

    const kardexResult = await client.query(
      `INSERT INTO kardex
         (libro_id, usuario_id, tipo_movimiento, cantidad,
          saldo_anterior, saldo_resultante, observacion)
       VALUES ($1, $2, $3, $4, $5, $6, $7)
       RETURNING id`,
      [
        libro_id,
        req.usuario.id,
        tipo,
        cantidadNum,
        saldoAnterior,
        saldoResultante,
        observacion?.trim() || null,
      ]
    );

    await client.query('COMMIT');

    return res.json({
      stock_nuevo: saldoResultante,
      kardex_id: kardexResult.rows[0].id,
    });
  } catch (err) {
    await client.query('ROLLBACK');
    console.error('Error en ajustarStock:', err);
    return res.status(500).json({ error: 'Error al ajustar stock' });
  } finally {
    client.release();
  }
}

module.exports = { registrarMovimiento, getMovimientos, ajustarStock };
