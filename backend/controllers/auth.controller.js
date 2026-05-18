const bcrypt = require('bcrypt');
const jwt = require('jsonwebtoken');
const pool = require('../db/pool');

/**
 * POST /api/auth/login
 * Body: { email: string, password: string }
 * Response 200: { token: string, usuario: { id, nombre, rol } }
 * Response 401: { error: "Credenciales incorrectas" }
 */
async function login(req, res) {
  const { email, password } = req.body;

  // Validación básica de presencia de campos
  if (!email || !password) {
    return res.status(400).json({ error: 'Email y contraseña son requeridos' });
  }

  try {
    // Buscar usuario activo por email
    const result = await pool.query(
      'SELECT id, nombre, email, password, rol FROM usuarios WHERE email = $1 AND activo = TRUE',
      [email.toLowerCase().trim()]
    );

    if (result.rows.length === 0) {
      // No revelar si el email existe o no — mismo mensaje genérico
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    const usuario = result.rows[0];

    // Comparar contraseña con hash bcrypt
    const passwordValida = await bcrypt.compare(password, usuario.password);

    if (!passwordValida) {
      return res.status(401).json({ error: 'Credenciales incorrectas' });
    }

    // Generar JWT con payload mínimo necesario
    const payload = {
      id: usuario.id,
      nombre: usuario.nombre,
      rol: usuario.rol,
    };

    const token = jwt.sign(payload, process.env.JWT_SECRET, {
      expiresIn: process.env.JWT_EXPIRES_IN || '8h',
    });

    // Responder sin incluir el hash de contraseña
    return res.status(200).json({
      token,
      usuario: {
        id: usuario.id,
        nombre: usuario.nombre,
        rol: usuario.rol,
      },
    });
  } catch (err) {
    console.error('Error en login:', err);
    return res.status(500).json({ error: 'Error interno del servidor' });
  }
}

/**
 * POST /api/auth/logout
 * Stateless: el cliente elimina el token localmente.
 * Este endpoint es opcional pero útil para auditoría futura.
 */
function logout(req, res) {
  return res.status(200).json({ mensaje: 'Sesión cerrada correctamente' });
}

module.exports = { login, logout };
