require('dotenv').config();
const express = require('express');
const cors = require('cors');

// Importar rutas
const authRoutes        = require('./routes/auth.routes');
const librosRoutes      = require('./routes/libros.routes');
const movimientosRoutes = require('./routes/movimientos.routes');
const reportesRoutes    = require('./routes/reportes.routes');
const usuariosRoutes    = require('./routes/usuarios.routes');
const ventasRoutes      = require('./routes/ventas.routes');

const app = express();

// ─── Middlewares globales ───────────────────────────────────────────────────
app.use(cors({
  origin: process.env.FRONTEND_URL || 'http://localhost:5173',
  credentials: true,
}));
app.use(express.json());

// ─── Rutas ──────────────────────────────────────────────────────────────────
app.use('/api/auth',         authRoutes);
app.use('/api/libros',       librosRoutes);
app.use('/api/movimientos',  movimientosRoutes);
app.use('/api/reportes',     reportesRoutes);
app.use('/api/usuarios',     usuariosRoutes);
app.use('/api/ventas',       ventasRoutes);

// ─── Health check ───────────────────────────────────────────────────────────
app.get('/api/health', (req, res) => {
  res.json({ status: 'ok', timestamp: new Date().toISOString() });
});

// ─── Manejo de rutas no encontradas ─────────────────────────────────────────
app.use((req, res) => {
  res.status(404).json({ error: 'Ruta no encontrada' });
});

// ─── Manejo global de errores ────────────────────────────────────────────────
app.use((err, req, res, next) => {
  console.error('Error no controlado:', err);
  res.status(500).json({ error: 'Error interno del servidor' });
});

// ─── Iniciar servidor ────────────────────────────────────────────────────────
const PORT = process.env.PORT || 3001;
app.listen(PORT, () => {
  console.log(`✅ Servidor LibroStock corriendo en http://localhost:${PORT}`);
});

module.exports = app;
