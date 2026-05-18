import { useNavigate } from 'react-router-dom';

function NoAutorizado() {
  const navigate = useNavigate();
  return (
    <div style={{
      minHeight: '100vh', display: 'flex', flexDirection: 'column',
      alignItems: 'center', justifyContent: 'center', background: '#F8F9FA',
      fontFamily: 'Geist, sans-serif', gap: '16px', textAlign: 'center', padding: '24px'
    }}>
      <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
        <circle cx="24" cy="24" r="23" stroke="#BA1A1A" strokeWidth="2"/>
        <path d="M24 16v12M24 32v2" stroke="#BA1A1A" strokeWidth="2.5" strokeLinecap="round"/>
      </svg>
      <h1 style={{ fontSize: '22px', fontWeight: 600, color: '#191C1D' }}>Acceso denegado</h1>
      <p style={{ fontSize: '14px', color: '#6B7280', maxWidth: '320px' }}>
        No tienes permisos para ver esta página. Contacta al administrador si crees que esto es un error.
      </p>
      <button
        onClick={() => navigate(-1)}
        style={{
          height: '38px', padding: '0 20px', background: '#4F46E5', color: '#fff',
          border: 'none', borderRadius: '8px', fontSize: '14px', fontWeight: 500,
          cursor: 'pointer', marginTop: '8px'
        }}
      >
        Volver
      </button>
    </div>
  );
}

export default NoAutorizado;
