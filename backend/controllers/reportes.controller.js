const pool = require('../db/pool');

/**
 * GET /api/reportes/resumen?periodo=hoy|semana|mes
 * Devuelve las 3 métricas del dashboard y los 5 libros críticos.
 */
async function getResumen(req, res) {
  const { periodo = 'hoy' } = req.query;

  // Calcular rango de fechas según periodo
  let intervalo;
  if (periodo === 'semana') intervalo = "NOW() - INTERVAL '7 days'";
  else if (periodo === 'mes') intervalo = "NOW() - INTERVAL '30 days'";
  else                        intervalo = "NOW() - INTERVAL '1 day'";

  try {
    const [totalStock, entradas, salidas, criticos] = await Promise.all([
      // Total de stock en almacén (todos los libros activos)
      pool.query(
        `SELECT COALESCE(SUM(stock_actual), 0) AS total
         FROM libros WHERE estado_activo = TRUE`
      ),
      // Entradas del periodo
      pool.query(
        `SELECT COALESCE(SUM(cantidad), 0) AS total
         FROM kardex
         WHERE tipo_movimiento = 'ENTRADA' AND creado_en >= ${intervalo}`
      ),
      // Salidas del periodo
      pool.query(
        `SELECT COALESCE(SUM(cantidad), 0) AS total
         FROM kardex
         WHERE tipo_movimiento = 'SALIDA' AND creado_en >= ${intervalo}`
      ),
      // Top 5 libros con stock más bajo (críticos)
      pool.query(
        `SELECT id, titulo, stock_actual, foto_url
         FROM libros
         WHERE estado_activo = TRUE
         ORDER BY stock_actual ASC
         LIMIT 5`
      ),
    ]);

    return res.json({
      total_stock:      parseInt(totalStock.rows[0].total, 10),
      entradas_periodo: parseInt(entradas.rows[0].total, 10),
      salidas_periodo:  parseInt(salidas.rows[0].total, 10),
      libros_criticos:  criticos.rows,
    });
  } catch (err) {
    console.error('Error en getResumen:', err);
    return res.status(500).json({ error: 'Error al obtener el resumen' });
  }
}

module.exports = { getResumen };
