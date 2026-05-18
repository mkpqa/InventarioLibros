import { useState, useEffect } from 'react';
import { NavLink } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import './Sidebar.css';

const NAV_ITEMS = [
  {
    to: '/dashboard',
    label: 'Dashboard',
    roles: ['admin'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <rect x="2" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="2" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="2" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
        <rect x="10" y="10" width="6" height="6" rx="1.5" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    to: '/inventario',
    label: 'Inventario',
    roles: ['admin'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M3 4.5h12M3 9h12M3 13.5h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
  {
    to: '/ventas',
    label: 'Ventas',
    roles: ['admin', 'operario'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M4 6H16L15 14H5L4 6Z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
        <path d="M5 6L4 3H2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
        <circle cx="6" cy="16" r="1" fill="currentColor"/>
        <circle cx="14" cy="16" r="1" fill="currentColor"/>
      </svg>
    ),
  },
  {
    to: '/trazabilidad',
    label: 'Trazabilidad',
    roles: ['admin'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <path d="M9 2v4M9 12v4M2 9h4M12 9h4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
        <circle cx="9" cy="9" r="3" stroke="currentColor" strokeWidth="1.5"/>
      </svg>
    ),
  },
  {
    to: '/usuarios',
    label: 'Usuarios',
    roles: ['admin'],
    icon: (
      <svg width="18" height="18" viewBox="0 0 18 18" fill="none">
        <circle cx="9" cy="6" r="3" stroke="currentColor" strokeWidth="1.5"/>
        <path d="M3 15c0-3.314 2.686-6 6-6s6 2.686 6 6" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
      </svg>
    ),
  },
];

/**
 * Sidebar — Menú lateral del sistema
 * Solo visible para Admin.
 * Responsive: colapsa en móvil.
 */
function Sidebar({ isOpen, onClose }) {
  const { usuario } = useAuth();

  const itemsVisibles = NAV_ITEMS.filter(item => item.roles.includes(usuario?.rol));

  const [isDark, setIsDark] = useState(false);

  useEffect(() => {
    // Recuperar preferencia
    const saved = localStorage.getItem('theme');
    if (saved === 'dark') {
      setIsDark(true);
      document.documentElement.classList.add('dark');
    }
  }, []);

  const toggleDarkMode = () => {
    if (isDark) {
      document.documentElement.classList.remove('dark');
      localStorage.setItem('theme', 'light');
    } else {
      document.documentElement.classList.add('dark');
      localStorage.setItem('theme', 'dark');
    }
    setIsDark(!isDark);
  };

  return (
    <>
      {/* Overlay móvil */}
      {isOpen && <div className="sidebar-overlay" onClick={onClose} />}

      <aside className={`sidebar ${isOpen ? 'sidebar--open' : ''}`}>
        <nav className="sidebar__nav">
          {itemsVisibles.map((item) => (
            <NavLink
              key={item.to}
              to={item.to}
              className={({ isActive }) =>
                `sidebar__link ${isActive ? 'sidebar__link--active' : ''}`
              }
              onClick={() => onClose?.()}
            >
              <span className="sidebar__icon">{item.icon}</span>
              <span className="sidebar__label">{item.label}</span>
            </NavLink>
          ))}
        </nav>
        <div style={{ marginTop: 'auto', padding: '16px' }}>
          <button 
            onClick={toggleDarkMode}
            style={{
              display: 'flex', alignItems: 'center', gap: '12px', width: '100%',
              padding: '12px 16px', borderRadius: '8px', border: 'none',
              background: isDark ? '#334155' : '#F1F5F9',
              color: isDark ? '#F8FAFC' : '#475569',
              cursor: 'pointer', fontWeight: 500, fontSize: '14px',
              transition: 'background 0.2s'
            }}
          >
            {isDark ? '☀️ Modo Claro' : '🌙 Modo Oscuro'}
          </button>
        </div>
      </aside>
    </>
  );
}

export default Sidebar;
