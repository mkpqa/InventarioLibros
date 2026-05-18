const { Pool } = require('pg');

/**
 * Pool de conexión a PostgreSQL.
 * Lee la cadena de conexión desde la variable de entorno DATABASE_URL.
 * El pool mantiene conexiones reutilizables para mejor rendimiento.
 */
const pool = new Pool({
  connectionString: process.env.DATABASE_URL,
  // En producción se recomienda agregar:
  // ssl: { rejectUnauthorized: false }
});

// Verificar conexión al iniciar
pool.connect((err, client, release) => {
  if (err) {
    console.error('❌ Error conectando a PostgreSQL:', err.message);
    console.error('   Verifica que DATABASE_URL en .env sea correcta.');
  } else {
    console.log('✅ Conectado a PostgreSQL correctamente.');
    release();
  }
});

module.exports = pool;
