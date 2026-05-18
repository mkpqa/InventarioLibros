const express = require('express');
const router  = express.Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole   = require('../middleware/checkRole');
const { getResumen } = require('../controllers/reportes.controller');

router.get('/resumen', verifyToken, checkRole('admin'), getResumen);

module.exports = router;
