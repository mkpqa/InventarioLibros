/**
 * ventas.api.js — Funciones de comunicación con /api/ventas
 */

const API_URL = import.meta.env.VITE_API_URL;

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function apiRegistrarVenta(token, ventaData) {
  const res = await fetch(`${API_URL}/ventas`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(ventaData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al registrar la venta');
  return data;
}

export async function apiGetVentas(token) {
  const res = await fetch(`${API_URL}/ventas`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener ventas');
  return data;
}

export async function apiGetVentaById(token, id) {
  const res = await fetch(`${API_URL}/ventas/${id}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener el detalle de la venta');
  return data;
}
