const API_URL = import.meta.env.VITE_API_URL;

function authHeaders(token) {
  return { Authorization: `Bearer ${token}` };
}

export async function apiGetResumen(token, periodo = 'hoy') {
  const res  = await fetch(`${API_URL}/reportes/resumen?periodo=${periodo}`, {
    headers: authHeaders(token),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al obtener resumen');
  return json;
}
