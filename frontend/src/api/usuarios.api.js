const API_URL = import.meta.env.VITE_API_URL;

function authHeaders(token) {
  return { 'Content-Type': 'application/json', Authorization: `Bearer ${token}` };
}

export async function apiGetUsuarios(token) {
  const res  = await fetch(`${API_URL}/usuarios`, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al obtener usuarios');
  return json;
}

export async function apiCrearUsuario(token, data) {
  const res  = await fetch(`${API_URL}/usuarios`, {
    method: 'POST', headers: authHeaders(token), body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al crear usuario');
  return json;
}

export async function apiToggleEstado(token, id) {
  const res  = await fetch(`${API_URL}/usuarios/${id}/estado`, {
    method: 'PUT', headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al cambiar estado');
  return json;
}

export async function apiCambiarPassword(token, id, nueva_password) {
  const res  = await fetch(`${API_URL}/usuarios/${id}/password`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify({ nueva_password }),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al cambiar contraseña');
  return json;
}

export async function apiEditarUsuario(token, id, data) {
  const res = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'PUT', headers: authHeaders(token), body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al editar usuario');
  return json;
}

export async function apiDesactivarUsuario(token, id) {
  const res = await fetch(`${API_URL}/usuarios/${id}`, {
    method: 'DELETE', headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al desactivar usuario');
  return json;
}
