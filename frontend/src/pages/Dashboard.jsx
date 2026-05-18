import { useState, useEffect, useCallback } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGetResumen } from '../api/reportes.api';
import AppLayout from '../components/AppLayout';
import StockBadge from '../components/StockBadge';
import './Dashboard.css';

const PERIODOS = [
  { valor: 'hoy',    label: 'Hoy' },
  { valor: 'semana', label: '7 días' },
  { valor: 'mes',    label: '30 días' },
];

function Dashboard() {
  const { token, usuario } = useAuth();
  const navigate = useNavigate();

  const [periodo,   setPeriodo]   = useState('hoy');
  const [resumen,   setResumen]   = useState(null);
  const [cargando,  setCargando]  = useState(true);
  const [error,     setError]     = useState('');

  const cargar = useCallback(async (p) => {
    setCargando(true);
    setError('');
    try {
      const data = await apiGetResumen(token, p);
      setResumen(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token]);

  useEffect(() => { cargar(periodo); }, [periodo]);

  // Hora de saludo
  const hora = new Date().getHours();
  const saludo = hora < 12 ? 'Buenos días' : hora < 19 ? 'Buenas tardes' : 'Buenas noches';

  return (
    <AppLayout>
      <div className="dashboard">
        {/* ── Cabecera ─────────────────────────────────────────── */}
        <div className="dash-header">
          <div>
            <h1 className="page-title">{saludo}, {usuario?.nombre?.split(' ')[0]} 👋</h1>
            <p className="page-subtitle">Aquí está el resumen de tu inventario</p>
          </div>
          {/* Selector de periodo */}
          <div className="periodo-selector">
            {PERIODOS.map(p => (
              <button
                key={p.valor}
                id={`btn-periodo-${p.valor}`}
                className={`periodo-btn ${periodo === p.valor ? 'periodo-btn--active' : ''}`}
                onClick={() => setPeriodo(p.valor)}
              >
                {p.label}
              </button>
            ))}
          </div>
        </div>

        {cargando ? (
          <div className="dash-loading">
            <div className="loading-spinner" />
            <span>Calculando métricas...</span>
          </div>
        ) : error ? (
          <div className="dash-error">
            <p>⚠️ {error}</p>
            <button className="btn-outline" onClick={() => cargar(periodo)}>Reintentar</button>
          </div>
        ) : (
          <>
            {/* ── Tarjetas de métricas ─────────────────────────── */}
            <div className="metric-grid">
              <div className="metric-card">
                <div className="metric-card__icon metric-card__icon--blue">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M3 5h16M3 11h10M3 17h13" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
                  </svg>
                </div>
                <div className="metric-card__body">
                  <span className="metric-card__label">Total en stock</span>
                  <span className="metric-card__value">
                    {resumen.total_stock.toLocaleString()}
                  </span>
                  <span className="metric-card__sub">unidades en almacén</span>
                </div>
              </div>

              <div className="metric-card metric-card--green">
                <div className="metric-card__icon metric-card__icon--green">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 4v14M6 12l5 6 5-6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="metric-card__body">
                  <span className="metric-card__label">Entradas</span>
                  <span className="metric-card__value metric-card__value--green">
                    +{resumen.entradas_periodo.toLocaleString()}
                  </span>
                  <span className="metric-card__sub">{PERIODOS.find(p=>p.valor===periodo)?.label}</span>
                </div>
              </div>

              <div className="metric-card metric-card--red">
                <div className="metric-card__icon metric-card__icon--red">
                  <svg width="22" height="22" viewBox="0 0 22 22" fill="none">
                    <path d="M11 18V4M6 10l5-6 5 6" stroke="currentColor" strokeWidth="2" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                </div>
                <div className="metric-card__body">
                  <span className="metric-card__label">Salidas</span>
                  <span className="metric-card__value metric-card__value--red">
                    -{resumen.salidas_periodo.toLocaleString()}
                  </span>
                  <span className="metric-card__sub">{PERIODOS.find(p=>p.valor===periodo)?.label}</span>
                </div>
              </div>
            </div>

            {/* ── Libros críticos ──────────────────────────────── */}
            <div className="criticos-card">
              <div className="criticos-card__header">
                <h2 className="criticos-card__title">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 2l1.7 3.4L13 6.1l-2.5 2.4.6 3.5L8 10.1l-3.1 1.9.6-3.5L3 6.1l3.3-.7L8 2z" stroke="#B45309" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  Libros con stock crítico
                </h2>
                <button
                  className="btn-link"
                  onClick={() => navigate('/inventario')}
                  id="btn-ver-inventario"
                >
                  Ver inventario →
                </button>
              </div>

              {resumen.libros_criticos.length === 0 ? (
                <p className="criticos-empty">✅ Todos los libros tienen stock saludable</p>
              ) : (
                <div className="criticos-list">
                  {resumen.libros_criticos.map(l => (
                    <div key={l.id} className="critico-item">
                      <div className="critico-item__avatar">
                        {l.foto_url ? (
                          <img src={l.foto_url} alt={l.titulo} onError={e => { e.target.style.display='none'; }} />
                        ) : (
                          <svg width="20" height="20" viewBox="0 0 20 20" fill="none">
                            <path d="M4 4h12M4 10h7M4 16h9" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
                          </svg>
                        )}
                      </div>
                      <span className="critico-item__titulo">{l.titulo}</span>
                      <StockBadge stock={l.stock_actual} />
                    </div>
                  ))}
                </div>
              )}
            </div>

            {/* ── Accesos rápidos ───────────────────────────────── */}
            <div className="quick-actions">
              <h2 className="quick-actions__title">Accesos rápidos</h2>
              <div className="quick-grid">
                {[
                  { label: 'Registrar entrada',  icon: '↓', color: 'green', path: '/escaneo' },
                  { label: 'Registrar salida',   icon: '↑', color: 'red',   path: '/escaneo' },
                  { label: 'Añadir libro',        icon: '+', color: 'blue',  path: '/inventario/nuevo' },
                  { label: 'Ver trazabilidad',    icon: '⟳', color: 'gray',  path: '/trazabilidad' },
                ].map(qa => (
                  <button
                    key={qa.label}
                    id={`btn-qa-${qa.label.replace(/\s+/g,'-').toLowerCase()}`}
                    className={`quick-card quick-card--${qa.color}`}
                    onClick={() => navigate(qa.path)}
                  >
                    <span className="quick-card__icon">{qa.icon}</span>
                    <span className="quick-card__label">{qa.label}</span>
                  </button>
                ))}
              </div>
            </div>
          </>
        )}
      </div>
    </AppLayout>
  );
}

export default Dashboard;
