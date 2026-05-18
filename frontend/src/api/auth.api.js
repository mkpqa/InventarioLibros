/**
 * auth.api.js
 * Funciones de comunicación con el backend de autenticación.
 */

const API_URL = import.meta.env.VITE_API_URL;

/**
 * Realiza el login contra el backend.
 * @param {string} email
 * @param {string} password
 * @returns {{ token, usuario }} o lanza un Error con el mensaje del backend
 */
export async function apiLogin(email, password) {
  const response = await fetch(`${API_URL}/auth/login`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ email, password }),
  });

  const data = await response.json();

  if (!response.ok) {
    throw new Error(data.error || 'Error al iniciar sesión');
  }

  return data; // { token, usuario: { id, nombre, rol } }
}

/**
 * Llama al endpoint de logout (stateless, opcional).
 * @param {string} token - JWT del usuario
 */
export async function apiLogout(token) {
  await fetch(`${API_URL}/auth/logout`, {
    method: 'POST',
    headers: { Authorization: `Bearer ${token}` },
  });
}
