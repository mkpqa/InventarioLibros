const pool = require('../db/pool');

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/libros
// Lista todos los libros activos (estado_activo = true)
// Acceso: Admin y Operario
// ─────────────────────────────────────────────────────────────────────────────
async function getLibros(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, codigo_barras, titulo, descripcion, foto_url,
              stock_actual, creado_en, actualizado_en
       FROM libros
       WHERE estado_activo = TRUE
       ORDER BY titulo ASC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en getLibros:', err);
    return res.status(500).json({ error: 'Error al obtener libros' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/libros/:id
// Detalle de un libro (activo o inactivo, para el formulario de edición)
// Acceso: Admin
// ─────────────────────────────────────────────────────────────────────────────
async function getLibroById(req, res) {
  const { id } = req.params;

  if (isNaN(parseInt(id))) {
    return res.status(400).json({ error: 'ID inválido' });
  }

  try {
    const result = await pool.query(
      `SELECT id, codigo_barras, titulo, descripcion, foto_url,
              stock_actual, estado_activo, creado_en, actualizado_en
       FROM libros
       WHERE id = $1`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Libro no encontrado' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en getLibroById:', err);
    return res.status(500).json({ error: 'Error al obtener el libro' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// POST /api/libros
// Crear libro. Si stock_inicial > 0, también crea registro en kardex.
// Acceso: Admin
// ─────────────────────────────────────────────────────────────────────────────
async function crearLibro(req, res) {
  const { codigo_barras, titulo, descripcion, foto_url, stock_inicial = 0 } = req.body;

  // Validaciones
  if (!codigo_barras || !titulo) {
    return res.status(400).json({ error: 'codigo_barras y titulo son requeridos' });
  }

  const stockNum = parseInt(stock_inicial, 10);
  if (isNaN(stockNum) || stockNum < 0) {
    return res.status(400).json({ error: 'stock_inicial debe ser un número entero >= 0' });
  }

  const client = await pool.connect();
  try {
    await client.query('BEGIN');

    // Insertar el libro
    const insertResult = await client.query(
      `INSERT INTO libros (codigo_barras, titulo, descripcion, foto_url, stock_actual)
       VALUES ($1, $2, $3, $4, $5)
       RETURNING id, codigo_barras, titulo, descripcion, foto_url, stock_actual, creado_en`,
      [
        codigo_barras.trim(),
        titulo.trim(),
        descripcion?.trim() || null,
        foto_url || null,
        stockNum,
      ]
    );

    const libro = insertResult.rows[0];

    // Si hay stock inicial, crear entrada en kardex
    if (stockNum > 0) {
      await client.query(
        `INSERT INTO kardex (libro_id, usuario_id, tipo_movimiento, cantidad, saldo_anterior, saldo_resultante, observacion)
         VALUES ($1, $2, 'ENTRADA', $3, 0, $4, 'Stock inicial al registrar libro')`,
        [libro.id, req.usuario.id, stockNum, stockNum]
      );
    }

    await client.query('COMMIT');
    return res.status(201).json(libro);
  } catch (err) {
    await client.query('ROLLBACK');

    // Código 23505 = unique_violation en PostgreSQL (código de barras duplicado)
    if (err.code === '23505') {
      return res.status(409).json({ error: 'El código de barras ya existe' });
    }

    console.error('Error en crearLibro:', err);
    return res.status(500).json({ error: 'Error al crear el libro' });
  } finally {
    client.release();
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// PUT /api/libros/:id
// Editar título, descripción y foto_url. El código de barras y stock NO se editan aquí.
// Acceso: Admin
// ─────────────────────────────────────────────────────────────────────────────
async function editarLibro(req, res) {
  const { id } = req.params;
  const { titulo, descripcion, foto_url } = req.body;

  if (!titulo) {
    return res.status(400).json({ error: 'El título es requerido' });
  }

  try {
    const result = await pool.query(
      `UPDATE libros
       SET titulo = $1,
           descripcion = $2,
           foto_url = $3,
           actualizado_en = NOW()
       WHERE id = $4 AND estado_activo = TRUE
       RETURNING id, codigo_barras, titulo, descripcion, foto_url, stock_actual, actualizado_en`,
      [titulo.trim(), descripcion?.trim() || null, foto_url || null, id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Libro no encontrado o inactivo' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en editarLibro:', err);
    return res.status(500).json({ error: 'Error al editar el libro' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// DELETE /api/libros/:id
// Soft delete: estado_activo = false. El historial de kardex se conserva.
// Acceso: Admin
// ─────────────────────────────────────────────────────────────────────────────
async function eliminarLibro(req, res) {
  const { id } = req.params;

  try {
    const result = await pool.query(
      `UPDATE libros
       SET estado_activo = FALSE, actualizado_en = NOW()
       WHERE id = $1 AND estado_activo = TRUE
       RETURNING id`,
      [id]
    );

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Libro no encontrado o ya inactivo' });
    }

    return res.json({ mensaje: 'Libro desactivado correctamente' });
  } catch (err) {
    console.error('Error en eliminarLibro:', err);
    return res.status(500).json({ error: 'Error al eliminar el libro' });
  }
}

// ─────────────────────────────────────────────────────────────────────────────
// GET /api/libros/buscar?q=texto
// Búsqueda para el autocompletado del módulo de Ventas.
// Retorna id, titulo, codigo_barras, stock_actual, foto_url.
// Acceso: Admin y Operario
// ─────────────────────────────────────────────────────────────────────────────
async function buscarLibros(req, res) {
  const { q = '' } = req.query;
  const termino = q.trim();

  if (termino.length < 1) {
    return res.json([]);
  }

  try {
    const result = await pool.query(
      `SELECT id, titulo, codigo_barras, stock_actual, foto_url
       FROM libros
       WHERE estado_activo = TRUE
         AND (titulo ILIKE $1 OR codigo_barras ILIKE $1)
       ORDER BY
         CASE WHEN titulo ILIKE $2 THEN 0 ELSE 1 END,
         titulo ASC
       LIMIT 10`,
      [`%${termino}%`, `${termino}%`]
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en buscarLibros:', err);
    return res.status(500).json({ error: 'Error al buscar libros' });
  }
}

module.exports = { getLibros, getLibroById, crearLibro, editarLibro, eliminarLibro, buscarLibros };
