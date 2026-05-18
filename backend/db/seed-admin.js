/**
 * seed-admin.js
 * ─────────────────────────────────────────────────────────────
 * Script de un solo uso para crear el usuario administrador inicial.
 * Ejecutar: node db/seed-admin.js
 *
 * Cambia el email y password antes de ejecutar en producción.
 * ─────────────────────────────────────────────────────────────
 */
require('dotenv').config();
const bcrypt = require('bcrypt');
const pool = require('./pool');

async function crearAdmin() {
  // ── Configura estos valores antes de ejecutar ──────────────
  const ADMIN_NOMBRE = 'Administrador LibroStock';
  const ADMIN_EMAIL  = 'admin@librostock.com';
  const ADMIN_PASS   = 'Admin2024!';  // ← Cambia esto en producción
  // ──────────────────────────────────────────────────────────

  try {
    console.log('🔐 Generando hash de contraseña...');
    const hashPassword = await bcrypt.hash(ADMIN_PASS, 12);

    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol)
       VALUES ($1, $2, $3, 'admin')
       ON CONFLICT (email) DO UPDATE
         SET nombre = EXCLUDED.nombre,
             password = EXCLUDED.password,
             activo = TRUE
       RETURNING id, nombre, email, rol`,
      [ADMIN_NOMBRE, ADMIN_EMAIL.toLowerCase(), hashPassword]
    );

    const admin = result.rows[0];
    console.log('✅ Usuario admin creado/actualizado:');
    console.log(`   ID:    ${admin.id}`);
    console.log(`   Nombre: ${admin.nombre}`);
    console.log(`   Email:  ${admin.email}`);
    console.log(`   Rol:    ${admin.rol}`);
    console.log('');
    console.log('⚠️  Recuerda cambiar la contraseña después del primer login.');
  } catch (err) {
    console.error('❌ Error al crear el admin:', err.message);
  } finally {
    await pool.end();
  }
}

crearAdmin();
