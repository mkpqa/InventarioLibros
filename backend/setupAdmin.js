const bcrypt = require('bcrypt');
const pool = require('./db/pool');

async function createAdmin() {
  const args = process.argv.slice(2);
  if (args.length !== 3) {
    console.log("Uso: node setupAdmin.js <nombre> <email> <contraseña>");
    process.exit(1);
  }

  const [nombre, email, password] = args;

  try {
    const hash = await bcrypt.hash(password, 10);
    const result = await pool.query(
      `INSERT INTO usuarios (nombre, email, password, rol, activo)
       VALUES ($1, $2, $3, 'admin', TRUE)
       RETURNING id, nombre, email, rol`,
      [nombre, email, hash]
    );
    
    console.log("✅ Administrador creado exitosamente:");
    console.log(result.rows[0]);
  } catch (error) {
    if (error.code === '23505') {
      console.log("❌ Error: Ya existe un usuario con ese correo electrónico.");
    } else {
      console.error("❌ Error al crear administrador:", error.message);
    }
  } finally {
    pool.end();
  }
}

createAdmin();
