/**
 * libros.api.js — Funciones de comunicación con /api/libros
 */

const API_URL = import.meta.env.VITE_API_URL;

function authHeaders(token) {
  return {
    'Content-Type': 'application/json',
    Authorization: `Bearer ${token}`,
  };
}

export async function apiGetLibros(token) {
  const res = await fetch(`${API_URL}/libros`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener libros');
  return data;
}

export async function apiGetLibroById(token, id) {
  const res = await fetch(`${API_URL}/libros/${id}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al obtener el libro');
  return data;
}

export async function apiCrearLibro(token, libroData) {
  const res = await fetch(`${API_URL}/libros`, {
    method: 'POST',
    headers: authHeaders(token),
    body: JSON.stringify(libroData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al crear el libro');
  return data;
}

export async function apiEditarLibro(token, id, libroData) {
  const res = await fetch(`${API_URL}/libros/${id}`, {
    method: 'PUT',
    headers: authHeaders(token),
    body: JSON.stringify(libroData),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al editar el libro');
  return data;
}

export async function apiEliminarLibro(token, id) {
  const res = await fetch(`${API_URL}/libros/${id}`, {
    method: 'DELETE',
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al eliminar el libro');
  return data;
}

export async function apiBuscarLibros(token, query) {
  const res = await fetch(`${API_URL}/libros/buscar?q=${encodeURIComponent(query)}`, {
    headers: authHeaders(token),
  });
  const data = await res.json();
  if (!res.ok) throw new Error(data.error || 'Error al buscar libros');
  return data;
}

/**
 * Subida de imagen directamente a Cloudinary (Upload Preset sin firma)
 * Retorna el secure_url de Cloudinary
 */
export async function subirImagenCloudinary(archivo) {
  const cloudName    = import.meta.env.VITE_CLOUDINARY_CLOUD_NAME;
  const uploadPreset = import.meta.env.VITE_CLOUDINARY_UPLOAD_PRESET;

  if (!cloudName || !uploadPreset) {
    throw new Error('Cloudinary no está configurado en las variables de entorno');
  }

  const formData = new FormData();
  formData.append('file', archivo);
  formData.append('upload_preset', uploadPreset);

  const res = await fetch(`https://api.cloudinary.com/v1_1/${cloudName}/image/upload`, {
    method: 'POST',
    body: formData,
  });

  const data = await res.json();
  if (!res.ok) throw new Error(data.error?.message || 'Error al subir imagen');
  return data.secure_url;
}
