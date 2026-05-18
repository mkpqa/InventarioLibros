-- ============================================================
-- LibroStock — Script de creación de base de datos
-- Ejecutar en PostgreSQL como superusuario o el dueño de la BD
-- ============================================================

-- Crear la base de datos (ejecutar esto separado si no existe)
-- CREATE DATABASE inventario_libros;

-- Conectarse a la base de datos antes de continuar:
-- \c inventario_libros

-- ────────────────────────────────────────────────────────────
-- TABLA: usuarios
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS usuarios (
  id          SERIAL PRIMARY KEY,
  nombre      VARCHAR(100) NOT NULL,
  email       VARCHAR(150) UNIQUE NOT NULL,
  password    VARCHAR(255) NOT NULL,        -- bcrypt hash
  rol         VARCHAR(20)  NOT NULL DEFAULT 'operario'
              CHECK (rol IN ('admin', 'operario')),
  activo      BOOLEAN      NOT NULL DEFAULT TRUE,
  creado_en   TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TABLA: libros
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS libros (
  id             SERIAL PRIMARY KEY,
  codigo_barras  VARCHAR(50)  UNIQUE NOT NULL,   -- ISBN o código interno
  titulo         VARCHAR(255) NOT NULL,
  descripcion    TEXT,
  foto_url       VARCHAR(500),                   -- URL de Cloudinary
  stock_actual   INTEGER      NOT NULL DEFAULT 0
                 CHECK (stock_actual >= 0),
  estado_activo  BOOLEAN      NOT NULL DEFAULT TRUE,  -- soft delete
  creado_en      TIMESTAMP    NOT NULL DEFAULT NOW(),
  actualizado_en TIMESTAMP    NOT NULL DEFAULT NOW()
);

-- ────────────────────────────────────────────────────────────
-- TABLA: kardex (registro inmutable de movimientos)
-- ────────────────────────────────────────────────────────────
CREATE TABLE IF NOT EXISTS kardex (
  id               SERIAL PRIMARY KEY,
  libro_id         INTEGER     NOT NULL REFERENCES libros(id),
  usuario_id       INTEGER     NOT NULL REFERENCES usuarios(id),
  tipo_movimiento  VARCHAR(20) NOT NULL
                   CHECK (tipo_movimiento IN ('ENTRADA', 'SALIDA', 'AJUSTE')),
  cantidad         INTEGER     NOT NULL CHECK (cantidad > 0),
  saldo_anterior   INTEGER     NOT NULL CHECK (saldo_anterior >= 0),
  saldo_resultante INTEGER     NOT NULL CHECK (saldo_resultante >= 0),
  observacion      TEXT,
  creado_en        TIMESTAMP   NOT NULL DEFAULT NOW()
  -- NOTA: Este registro es INMUTABLE. Nunca se hace UPDATE ni DELETE aquí.
);

-- ────────────────────────────────────────────────────────────
-- ÍNDICES RECOMENDADOS
-- ────────────────────────────────────────────────────────────
CREATE INDEX IF NOT EXISTS idx_kardex_libro_id  ON kardex(libro_id);
CREATE INDEX IF NOT EXISTS idx_kardex_creado_en ON kardex(creado_en);
CREATE INDEX IF NOT EXISTS idx_libros_codigo    ON libros(codigo_barras);
CREATE INDEX IF NOT EXISTS idx_usuarios_email   ON usuarios(email);

-- ────────────────────────────────────────────────────────────
-- Verificación
-- ────────────────────────────────────────────────────────────
SELECT tablename FROM pg_tables
WHERE schemaname = 'public'
ORDER BY tablename;
