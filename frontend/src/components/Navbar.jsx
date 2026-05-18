import { useAuth } from '../context/AuthContext';
import './Navbar.css';

/**
 * Navbar — Barra superior de LibroStock
 * Muestra: logo + nombre del sistema | nombre del usuario + rol + botón logout
 */
function Navbar({ onMenuToggle }) {
  const { usuario, logout } = useAuth();

  return (
    <header className="navbar">
      <div className="navbar__left">
        {/* Botón hamburguesa para móvil */}
        <button
          className="navbar__menu-btn"
          onClick={onMenuToggle}
          aria-label="Abrir menú"
          id="btn-menu-toggle"
        >
          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
            <path d="M3 5h14M3 10h14M3 15h14" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>

        {/* Logo */}
        <div className="navbar__brand" style={{ display: 'flex', alignItems: 'center', gap: '8px' }}>
          <svg width="28" height="28" viewBox="0 0 32 32" fill="none">
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
          <span className="navbar__brand-name">InventarioLibros</span>
        </div>
      </div>

      <div className="navbar__right">
        <div className="navbar__user">
          <div className="navbar__user-avatar">
            {usuario?.nombre?.charAt(0)?.toUpperCase() || 'U'}
          </div>
          <div className="navbar__user-info">
            <span className="navbar__user-name">{usuario?.nombre}</span>
            <span className="navbar__user-role">{usuario?.rol}</span>
          </div>
        </div>

        <button
          id="btn-logout-nav"
          className="navbar__logout"
          onClick={logout}
          title="Cerrar sesión"
        >
          <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
            <path d="M6.75 9H15.75M12.75 6L15.75 9L12.75 12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            <path d="M9.75 3.75H3.75A1.5 1.5 0 002.25 5.25v7.5a1.5 1.5 0 001.5 1.5h6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
          </svg>
        </button>
      </div>
    </header>
  );
}

export default Navbar;
