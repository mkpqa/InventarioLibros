/**
 * run-migration-v2.js
 * Ejecuta la migración V2 directamente usando el pool configurado en .env
 * Uso: node backend/db/run-migration-v2.js
 */

require('dotenv').config({ path: require('path').join(__dirname, '..', '.env') });
const { Pool } = require('pg');

const pool = new Pool({ connectionString: process.env.DATABASE_URL });

const SQL = `
-- 1. Tabla ventas
CREATE TABLE IF NOT EXISTS ventas (
  id             SERIAL PRIMARY KEY,
  numero_venta   VARCHAR(20) UNIQUE NOT NULL,
  cliente_nombre VARCHAR(150),
  precio_total   DECIMAL(10,2),
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id),
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Tabla detalle_ventas
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id          SERIAL PRIMARY KEY,
  venta_id    INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  libro_id    INTEGER NOT NULL REFERENCES libros(id),
  cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Columna venta_id en kardex (idempotente con DO block)
DO $$
BEGIN
  IF NOT EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_name = 'kardex' AND column_name = 'venta_id'
  ) THEN
    ALTER TABLE kardex ADD COLUMN venta_id INTEGER REFERENCES ventas(id);
  END IF;
END;
$$;

-- 4. Índices de performance
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id    ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_creado_en     ON ventas(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_venta_id     ON detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_libro_id     ON detalle_ventas(libro_id);
CREATE INDEX IF NOT EXISTS idx_kardex_venta_id      ON kardex(venta_id);
`;

async function run() {
  console.log('🔄 Conectando a PostgreSQL...');
  const client = await pool.connect();
  try {
    console.log('✅ Conexión establecida');
    console.log('🔄 Ejecutando migración V2...\n');

    await client.query(SQL);

    // Verificar tablas creadas
    const tablas = await client.query(`
      SELECT table_name
      FROM information_schema.tables
      WHERE table_schema = 'public'
        AND table_name IN ('ventas', 'detalle_ventas')
      ORDER BY table_name
    `);

    const columnaKardex = await client.query(`
      SELECT column_name
      FROM information_schema.columns
      WHERE table_name = 'kardex' AND column_name = 'venta_id'
    `);

    const indices = await client.query(`
      SELECT indexname
      FROM pg_indexes
      WHERE tablename IN ('ventas', 'detalle_ventas', 'kardex')
        AND indexname LIKE 'idx_%v%'
      ORDER BY indexname
    `);

    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━');
    console.log('✅ MIGRACIÓN V2 COMPLETADA EXITOSAMENTE');
    console.log('━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━━\n');

    console.log('📋 Tablas nuevas:');
    tablas.rows.forEach(r => console.log(`   ✅ ${r.table_name}`));

    console.log('\n🔗 Columna venta_id en kardex:');
    if (columnaKardex.rows.length > 0) {
      console.log('   ✅ kardex.venta_id existe');
    } else {
      console.log('   ❌ kardex.venta_id NO encontrada');
    }

    console.log('\n📊 Índices creados:');
    indices.rows.forEach(r => console.log(`   ✅ ${r.indexname}`));

    console.log('\n🎉 El backend está listo para PASO 2.');
  } catch (err) {
    console.error('\n❌ Error en la migración:', err.message);
    process.exit(1);
  } finally {
    client.release();
    await pool.end();
  }
}

run();
