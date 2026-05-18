const express = require('express');
const router  = express.Router();
const verifyToken = require('../middleware/verifyToken');
const checkRole   = require('../middleware/checkRole');
const {
  getUsuarios,
  crearUsuario,
  editarUsuario,
  desactivarUsuario,
  toggleEstado,
} = require('../controllers/usuarios.controller');

// Todo solo admin
router.get('/',               verifyToken, checkRole('admin'), getUsuarios);
router.post('/',              verifyToken, checkRole('admin'), crearUsuario);
router.put('/:id',            verifyToken, checkRole('admin'), editarUsuario);
router.delete('/:id',         verifyToken, checkRole('admin'), desactivarUsuario);
router.put('/:id/estado',     verifyToken, checkRole('admin'), toggleEstado);

module.exports = router;
