const express = require('express');
const router  = express.Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole   = require('../middleware/checkRole');
const { registrarVenta, getVentas, getVentaById } = require('../controllers/ventas.controller');

// POST /api/ventas — Admin y Operario
router.post('/',    verifyToken, checkRole('admin', 'operario'), registrarVenta);

// GET /api/ventas — Admin y Operario
router.get('/',     verifyToken, checkRole('admin', 'operario'), getVentas);

// GET /api/ventas/:id — Admin y Operario
router.get('/:id',  verifyToken, checkRole('admin', 'operario'), getVentaById);

module.exports = router;
