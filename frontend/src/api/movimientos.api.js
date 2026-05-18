/**
 * movimientos.api.js — Funciones de comunicación con /api/movimientos
 */

const API_URL = import.meta.env.VITE_API_URL;

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

/**
 * Registra una entrada o salida de un libro.
 * @param {string} token
 * @param {{ codigo_barras, tipo, cantidad, observacion? }} data
 * @returns {{ libro: { id, titulo, foto_url, stock_anterior, stock_nuevo }, kardex_id }}
 */
export async function apiRegistrarMovimiento(token, data) {
  const res = await fetch(`${API_URL}/movimientos`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al registrar movimiento');
  return json;
}

export async function apiAjustarStock(token, data) {
  const res = await fetch(`${API_URL}/movimientos/ajuste`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(data),
  });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al ajustar stock');
  return json;
}

/**
 * Obtiene el kardex con filtros opcionales.
 * @param {string} token
 * @param {{ desde?, hasta?, libro_id?, tipo?, page?, limit? }} filtros
 */
export async function apiGetMovimientos(token, filtros = {}) {
  const params = new URLSearchParams();
  Object.entries(filtros).forEach(([k, v]) => { if (v !== undefined && v !== '') params.set(k, v); });
  const url = `${API_URL}/movimientos?${params.toString()}`;
  const res  = await fetch(url, { headers: authHeaders(token) });
  const json = await res.json();
  if (!res.ok) throw new Error(json.error || 'Error al obtener movimientos');
  return json;
}
