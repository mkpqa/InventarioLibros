const express = require('express');
const router  = express.Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole   = require('../middleware/checkRole');
const {
  getLibros,
  getLibroById,
  crearLibro,
  editarLibro,
  eliminarLibro,
  buscarLibros,
} = require('../controllers/libros.controller');

// GET /api/libros/buscar?q= — DEBE ir antes de /:id para no ser capturado como param
router.get('/buscar', verifyToken, checkRole('admin', 'operario'), buscarLibros);

// GET /api/libros — Admin y Operario
router.get('/',    verifyToken, checkRole('admin', 'operario'), getLibros);

// GET /api/libros/:id — Solo Admin
router.get('/:id', verifyToken, checkRole('admin'), getLibroById);

// POST /api/libros — Solo Admin
router.post('/',   verifyToken, checkRole('admin'), crearLibro);

// PUT /api/libros/:id — Solo Admin
router.put('/:id', verifyToken, checkRole('admin'), editarLibro);

// DELETE /api/libros/:id — Solo Admin (soft delete)
router.delete('/:id', verifyToken, checkRole('admin'), eliminarLibro);

module.exports = router;
