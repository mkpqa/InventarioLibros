const express = require('express');
const router = express.Router();
const { login, logout } = require('../controllers/auth.controller');
const verifyToken = require('../middleware/verifyToken');

// POST /api/auth/login — pública
router.post('/login', login);

// POST /api/auth/logout — requiere token válido
router.post('/logout', verifyToken, logout);

module.exports = router;
