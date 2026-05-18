import { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiLogin } from '../api/auth.api';
import './Login.css';

/**
 * Login.jsx
 * Pantalla de inicio de sesión de LibroStock.
 * - Si ya hay token válido, redirige al destino según rol.
 * - Valida campos antes de hacer la llamada.
 * - Muestra spinner mientras espera la respuesta.
 * - Diseño fiel al sistema de diseño Stitch LibroStock.
 */
function Login() {
  const navigate = useNavigate();
  const { login, isAuthenticated, usuario, loading } = useAuth();

  const [email, setEmail] = useState('');
  const [password, setPassword] = useState('');
  const [error, setError] = useState('');
  const [cargando, setCargando] = useState(false);

  // Redirigir si ya está autenticado
  useEffect(() => {
    if (!loading && isAuthenticated) {
      redirigirSegunRol(usuario.rol);
    }
  }, [isAuthenticated, loading]);

  function redirigirSegunRol(rol) {
    if (rol === 'admin') navigate('/dashboard', { replace: true });
    else navigate('/escaneo', { replace: true });
  }

  function validar() {
    if (!email.trim()) {
      setError('El email es requerido');
      return false;
    }
    const emailRegex = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;
    if (!emailRegex.test(email)) {
      setError('Ingresa un email válido');
      return false;
    }
    if (!password) {
      setError('La contraseña es requerida');
      return false;
    }
    if (password.length < 6) {
      setError('La contraseña debe tener al menos 6 caracteres');
      return false;
    }
    return true;
  }

  async function handleSubmit(e) {
    e.preventDefault();
    setError('');

    if (!validar()) return;

    setCargando(true);
    try {
      const { token, usuario: datos } = await apiLogin(email, password);
      login(token, datos);
      redirigirSegunRol(datos.rol);
    } catch (err) {
      setError(err.message || 'Credenciales incorrectas');
    } finally {
      setCargando(false);
    }
  }

  if (loading) return null; // Espera inicialización del contexto

  return (
    <div className="login-page">
      {/* Panel izquierdo — decorativo */}
      <div className="login-left-panel">
        <div className="login-brand">
          <div className="login-logo-mark" style={{ background: 'transparent' }}>
            <svg width="48" height="48" viewBox="0 0 32 32" fill="none">
              {/* Libro Inferior (Azul) */}
              <path d="M4 22 L16 27 L28 22 L16 17 Z" fill="#0EA5E9" />
              <path d="M4 22 V26 L16 31 V27 Z" fill="#0284C7" />
              <path d="M28 22 V26 L16 31 V27 Z" fill="#E2E8F0" />
              
              {/* Libro Medio (Rojo) */}
              <path d="M4 16 L16 21 L28 16 L16 11 Z" fill="#EF4444" />
              <path d="M4 16 V20 L16 25 V21 Z" fill="#B91C1C" />
              <path d="M28 16 V20 L16 25 V21 Z" fill="#F1F5F9" />
              
              {/* Libro Superior (Verde) */}
              <path d="M4 10 L16 15 L28 10 L16 5 Z" fill="#22C55E" />
              <path d="M4 10 V14 L16 19 V15 Z" fill="#15803D" />
              <path d="M28 10 V14 L16 19 V15 Z" fill="#F8FAFC" />
            </svg>
          </div>
          <span className="login-brand-name">InventarioLibros</span>
        </div>
        <div className="login-left-content">
          <h1 className="login-headline">Control total de tu inventario</h1>
          <p className="login-subheadline">
            Gestiona entradas, salidas y trazabilidad de libros de forma eficiente y segura.
          </p>
          <div className="login-features">
            <div className="login-feature-item">
              <div className="feature-dot feature-dot--green" />
              <span>Semáforo de stock en tiempo real</span>
            </div>
            <div className="login-feature-item">
              <div className="feature-dot feature-dot--indigo" />
              <span>Escaneo con pistola o cámara</span>
            </div>
            <div className="login-feature-item">
              <div className="feature-dot feature-dot--amber" />
              <span>Kardex inmutable de movimientos</span>
            </div>
          </div>
        </div>
      </div>

      {/* Panel derecho — formulario */}
      <div className="login-right-panel">
        <div className="login-form-wrapper">
          <div className="login-form-header">
            <h2 className="login-form-title">Iniciar sesión</h2>
            <p className="login-form-subtitle">Ingresa tu usuario y contraseña para acceder al sistema</p>
          </div>

          <form onSubmit={handleSubmit} className="login-form" noValidate>
            <div className="form-group">
              <label htmlFor="login-email" className="form-label">
                Correo electrónico
              </label>
              <input
                id="login-email"
                type="email"
                className={`form-input ${error && !password ? 'form-input--error' : ''}`}
                placeholder="....."
                value={email}
                onChange={(e) => { setEmail(e.target.value); setError(''); }}
                autoComplete="email"
                autoFocus
                disabled={cargando}
              />
            </div>

            <div className="form-group">
              <label htmlFor="login-password" className="form-label">
                Contraseña
              </label>
              <input
                id="login-password"
                type="password"
                className={`form-input ${error ? 'form-input--error' : ''}`}
                placeholder="••••••••"
                value={password}
                onChange={(e) => { setPassword(e.target.value); setError(''); }}
                autoComplete="current-password"
                disabled={cargando}
              />
            </div>

            {error && (
              <div className="form-error" role="alert" aria-live="polite">
                <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                  <circle cx="8" cy="8" r="7" stroke="#BA1A1A" strokeWidth="1.5" />
                  <path d="M8 5v4M8 11v.5" stroke="#BA1A1A" strokeWidth="1.5" strokeLinecap="round" />
                </svg>
                {error}
              </div>
            )}

            <button
              id="btn-login-submit"
              type="submit"
              className="btn-login"
              disabled={cargando}
            >
              {cargando ? (
                <>
                  <span className="btn-spinner" aria-hidden="true" />
                  Verificando...
                </>
              ) : (
                'Ingresar'
              )}
            </button>
          </form>

          <p className="login-footer-note">
            Gracias
          </p>
        </div>
      </div>
    </div>
  );
}

export default Login;
