const pool   = require('../db/pool');
const bcrypt = require('bcrypt');

const SALT_ROUNDS = 10; // El doc V2 especifica saltRounds: 10

// ─── GET /api/usuarios ────────────────────────────────────────────────────────
async function getUsuarios(req, res) {
  try {
    const result = await pool.query(
      `SELECT id, nombre, email, rol, activo AS estado_activo, creado_en
       FROM usuarios
       ORDER BY creado_en DESC`
    );
    return res.json(result.rows);
  } catch (err) {
    console.error('Error en getUsuarios:', err);
    return res.status(500).json({ error: 'Error al obtener usuarios' });
  }
}

// ─── POST /api/usuarios ───────────────────────────────────────────────────────
// Crea un nuevo usuario con contraseña hasheada.
async function crearUsuario(req, res) {
  const { nombre, email, password, rol } = req.body;

  if (!nombre?.trim() || !email?.trim() || !password || !rol) {
    return res.status(400).json({ error: 'nombre, email, password y rol son requeridos' });
  }
  if (!['admin', 'operario'].includes(rol)) {
    return res.status(400).json({ error: 'rol debe ser admin u operario' });
  }
  if (password.length < 6) {
    return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  }
  if (!/\S+@\S+\.\S+/.test(email)) {
    return res.status(400).json({ error: 'El email no tiene un formato válido' });
  }

  try {
    const hash   = await bcrypt.hash(password, SALT_ROUNDS);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol)
       VALUES ($1, $2, $3, $4)
       RETURNING id, nombre, email, rol, activo AS estado_activo, creado_en`,
      [nombre.trim(), email.trim().toLowerCase(), hash, rol]
    );
    return res.status(201).json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este email ya está en uso' });
    }
    console.error('Error en crearUsuario:', err);
    return res.status(500).json({ error: 'Error al crear usuario' });
  }
}

// ─── PUT /api/usuarios/:id ────────────────────────────────────────────────────
// Edita nombre, email, rol y opcionalmente la contraseña.
// Si password viene vacío → no se actualiza la contraseña.
async function editarUsuario(req, res) {
  const { id }                             = req.params;
  const { nombre, email, rol, password }   = req.body;

  if (!nombre?.trim() || !email?.trim() || !rol) {
    return res.status(400).json({ error: 'nombre, email y rol son requeridos' });
  }
  if (!['admin', 'operario'].includes(rol)) {
    return res.status(400).json({ error: 'rol debe ser admin u operario' });
  }
  if (password && password.length < 6) {
    return res.status(400).json({ error: 'Mínimo 6 caracteres' });
  }

  try {
    let result;

    if (password) {
      // Actualizar todo incluyendo contraseña
      const hash = await bcrypt.hash(password, SALT_ROUNDS);
      result = await pool.query(
        `UPDATE usuarios
         SET nombre = $1, email = $2, rol = $3, password = $4
         WHERE id = $5
         RETURNING id, nombre, email, rol, activo AS estado_activo, creado_en`,
        [nombre.trim(), email.trim().toLowerCase(), rol, hash, id]
      );
    } else {
      // Actualizar sin contraseña
      result = await pool.query(
        `UPDATE usuarios
         SET nombre = $1, email = $2, rol = $3
         WHERE id = $4
         RETURNING id, nombre, email, rol, activo AS estado_activo, creado_en`,
        [nombre.trim(), email.trim().toLowerCase(), rol, id]
      );
    }

    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }

    return res.json(result.rows[0]);
  } catch (err) {
    if (err.code === '23505') {
      return res.status(409).json({ error: 'Este email ya está en uso' });
    }
    console.error('Error en editarUsuario:', err);
    return res.status(500).json({ error: 'Error al editar usuario' });
  }
}

// ─── DELETE /api/usuarios/:id ─────────────────────────────────────────────────
// Soft delete — desactiva el usuario. No puede desactivarse a sí mismo.
async function desactivarUsuario(req, res) {
  const { id } = req.params;

  if (parseInt(id, 10) === req.usuario.id) {
    return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
  }

  try {
    const result = await pool.query(
      `UPDATE usuarios
       SET activo = false
       WHERE id = $1
       RETURNING id, nombre, activo AS estado_activo`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json({ mensaje: 'Usuario desactivado', ...result.rows[0] });
  } catch (err) {
    console.error('Error en desactivarUsuario:', err);
    return res.status(500).json({ error: 'Error al desactivar usuario' });
  }
}

// ─── PUT /api/usuarios/:id/estado ────────────────────────────────────────────
// Toggle: activa o desactiva. Mantiene compatibilidad con el frontend existente.
async function toggleEstado(req, res) {
  const { id } = req.params;

  if (parseInt(id, 10) === req.usuario.id) {
    return res.status(400).json({ error: 'No puedes desactivarte a ti mismo' });
  }

  try {
    const result = await pool.query(
      `UPDATE usuarios
       SET activo = NOT activo
       WHERE id = $1
       RETURNING id, nombre, activo AS estado_activo`,
      [id]
    );
    if (result.rows.length === 0) {
      return res.status(404).json({ error: 'Usuario no encontrado' });
    }
    return res.json(result.rows[0]);
  } catch (err) {
    console.error('Error en toggleEstado:', err);
    return res.status(500).json({ error: 'Error al cambiar estado del usuario' });
  }
}

module.exports = { getUsuarios, crearUsuario, editarUsuario, desactivarUsuario, toggleEstado };
