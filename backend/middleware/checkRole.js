/**
 * Middleware: checkRole
 * Verifica que req.usuario.rol esté dentro de los roles permitidos.
 * DEBE usarse DESPUÉS de verifyToken en la cadena de middlewares.
 *
 * Uso:
 *   router.get('/ruta', verifyToken, checkRole('admin'), handler)
 *   router.get('/ruta', verifyToken, checkRole('admin', 'operario'), handler)
 */
function checkRole(...rolesPermitidos) {
  return (req, res, next) => {
    if (!req.usuario) {
      return res.status(401).json({ error: 'No autenticado' });
    }

    if (!rolesPermitidos.includes(req.usuario.rol)) {
      return res.status(403).json({
        error: `Acceso denegado. Se requiere rol: ${rolesPermitidos.join(' o ')}`,
      });
    }

    next();
  };
}

module.exports = checkRole;
