const jwt = require('jsonwebtoken');

/**
 * Middleware: verifyToken
 * Valida el JWT enviado en el header Authorization: Bearer <token>
 * Si es válido, agrega req.usuario = { id, nombre, rol }
 * Si es inválido o falta, responde 401.
 */
function verifyToken(req, res, next) {
  const authHeader = req.headers['authorization'];

  if (!authHeader || !authHeader.startsWith('Bearer ')) {
    return res.status(401).json({ error: 'Token no proporcionado' });
  }

  const token = authHeader.split(' ')[1];

  try {
    const decoded = jwt.verify(token, process.env.JWT_SECRET);
    req.usuario = {
      id: decoded.id,
      nombre: decoded.nombre,
      rol: decoded.rol,
    };
    next();
  } catch (err) {
    if (err.name === 'TokenExpiredError') {
      return res.status(401).json({ error: 'Token expirado. Inicia sesión nuevamente.' });
    }
    return res.status(401).json({ error: 'Token inválido' });
  }
}

module.exports = verifyToken;
