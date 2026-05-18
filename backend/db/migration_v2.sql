-- ═══════════════════════════════════════════════════════════════
-- LibroStock V2 — Migración de base de datos
-- Ejecutar en orden exacto. Seguro para correr más de una vez
-- gracias a las condiciones IF NOT EXISTS.
-- ═══════════════════════════════════════════════════════════════

-- 1. Tabla ventas (sin dependencias externas salvo usuarios)
CREATE TABLE IF NOT EXISTS ventas (
  id             SERIAL PRIMARY KEY,
  numero_venta   VARCHAR(20) UNIQUE NOT NULL,  -- VTA-0001, VTA-0002...
  cliente_nombre VARCHAR(150),                  -- opcional
  precio_total   DECIMAL(10,2),                 -- opcional
  usuario_id     INTEGER NOT NULL REFERENCES usuarios(id),
  creado_en      TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 2. Tabla detalle_ventas (depende de ventas y libros)
CREATE TABLE IF NOT EXISTS detalle_ventas (
  id          SERIAL PRIMARY KEY,
  venta_id    INTEGER NOT NULL REFERENCES ventas(id) ON DELETE CASCADE,
  libro_id    INTEGER NOT NULL REFERENCES libros(id),
  cantidad    INTEGER NOT NULL CHECK (cantidad > 0),
  creado_en   TIMESTAMP NOT NULL DEFAULT NOW()
);

-- 3. Agregar columna venta_id a kardex (idempotente)
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

-- 4. Índices para performance
CREATE INDEX IF NOT EXISTS idx_ventas_usuario_id      ON ventas(usuario_id);
CREATE INDEX IF NOT EXISTS idx_ventas_creado_en       ON ventas(creado_en DESC);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_venta   ON detalle_ventas(venta_id);
CREATE INDEX IF NOT EXISTS idx_detalle_ventas_libro   ON detalle_ventas(libro_id);
CREATE INDEX IF NOT EXISTS idx_kardex_venta_id        ON kardex(venta_id);

-- Verificación final
SELECT 'ventas'         AS tabla, COUNT(*) AS registros FROM ventas
UNION ALL
SELECT 'detalle_ventas' AS tabla, COUNT(*) AS registros FROM detalle_ventas
UNION ALL
SELECT 'kardex.venta_id existe' AS tabla,
       COUNT(*) AS registros
FROM information_schema.columns
WHERE table_name = 'kardex' AND column_name = 'venta_id';
