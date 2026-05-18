const express = require('express');
const router  = express.Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole   = require('../middleware/checkRole');
const { registrarMovimiento, getMovimientos, ajustarStock } =
  require('../controllers/movimientos.controller');

// POST /api/movimientos — Admin y Operario (módulo de escaneo legacy, se mantiene)
router.post('/', verifyToken, checkRole('admin', 'operario'), registrarMovimiento);

// POST /api/movimientos/ajuste — Solo Admin (ajuste manual desde Editar Producto)
router.post('/ajuste', verifyToken, checkRole('admin'), ajustarStock);

// GET /api/movimientos — Solo Admin (kardex con filtros)
router.get('/',  verifyToken, checkRole('admin'), getMovimientos);

module.exports = router;
