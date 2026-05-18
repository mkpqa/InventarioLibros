import { Navigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';

/**
 * ProtectedRoute
 * Guard de autenticación y rol.
 *
 * Props:
 *   - children: el componente a renderizar si pasa los checks
 *   - rolesPermitidos: array de roles que pueden acceder, ej: ['admin'] o ['admin', 'operario']
 *
 * Comportamiento:
 *   - Si aún está cargando el contexto → spinner (evita redirección prematura)
 *   - Si no hay token → redirige a /login
 *   - Si el rol no está en rolesPermitidos → redirige a /no-autorizado
 *   - Si todo está bien → renderiza children
 */
function ProtectedRoute({ children, rolesPermitidos = [] }) {
  const { isAuthenticated, usuario, loading } = useAuth();

  // Mientras el contexto inicializa desde localStorage, no redirigir aún
  if (loading) {
    return (
      <div className="auth-loading">
        <div className="spinner" />
      </div>
    );
  }

  if (!isAuthenticated) {
    return <Navigate to="/login" replace />;
  }

  if (rolesPermitidos.length > 0 && !rolesPermitidos.includes(usuario?.rol)) {
    return <Navigate to="/no-autorizado" replace />;
  }

  return children;
}

export default ProtectedRoute;
