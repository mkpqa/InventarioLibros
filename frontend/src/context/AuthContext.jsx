import { createContext, useContext, useState, useEffect } from 'react';
import { jwtDecode } from 'jwt-decode';

/**
 * AuthContext
 * Provee: { usuario, token, login(), logout(), isAuthenticated }
 *
 * Al inicializar, lee el token de localStorage y lo decodifica.
 * Si el token está expirado, limpia el estado y no autentica.
 */
const AuthContext = createContext(null);

export function AuthProvider({ children }) {
  const [token, setToken]     = useState(null);
  const [usuario, setUsuario] = useState(null);
  const [loading, setLoading] = useState(true); // evita flash de Login en rutas protegidas

  // Inicializar desde localStorage al montar
  useEffect(() => {
    const tokenGuardado = localStorage.getItem('librostock_token');

    if (tokenGuardado) {
      try {
        const decoded = jwtDecode(tokenGuardado);
        const ahora   = Date.now() / 1000;

        if (decoded.exp && decoded.exp < ahora) {
          // Token expirado — limpiar
          localStorage.removeItem('librostock_token');
        } else {
          setToken(tokenGuardado);
          setUsuario({ id: decoded.id, nombre: decoded.nombre, rol: decoded.rol });
        }
      } catch {
        localStorage.removeItem('librostock_token');
      }
    }

    setLoading(false);
  }, []);

  /**
   * login() — llamado después de que la API devuelve el JWT
   * @param {string} nuevoToken - JWT recibido del backend
   * @param {object} datosUsuario - { id, nombre, rol }
   */
  function login(nuevoToken, datosUsuario) {
    localStorage.setItem('librostock_token', nuevoToken);
    setToken(nuevoToken);
    setUsuario(datosUsuario);
  }

  /**
   * logout() — limpia el estado y localStorage
   */
  function logout() {
    localStorage.removeItem('librostock_token');
    setToken(null);
    setUsuario(null);
  }

  const isAuthenticated = !!token && !!usuario;

  return (
    <AuthContext.Provider value={{ token, usuario, login, logout, isAuthenticated, loading }}>
      {children}
    </AuthContext.Provider>
  );
}

/**
 * Hook de acceso al contexto de autenticación
 * Lanza error si se usa fuera del AuthProvider
 */
export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error('useAuth debe usarse dentro de <AuthProvider>');
  }
  return ctx;
}

export default AuthContext;
