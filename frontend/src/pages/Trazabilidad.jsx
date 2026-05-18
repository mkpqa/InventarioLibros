import { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiGetMovimientos } from '../api/movimientos.api';
import { apiGetLibros } from '../api/libros.api';
import { apiGetVentaById } from '../api/ventas.api';
import AppLayout from '../components/AppLayout';
import StockBadge from '../components/StockBadge';
import './Trazabilidad.css';

const TIPO_OPCIONES = ['', 'ENTRADA', 'SALIDA', 'AJUSTE'];

// ── Helpers de fecha ────────────────────────────────────────────
function hoy()         { return new Date().toISOString().split('T')[0]; }
function haceMes()     { const d = new Date(); d.setMonth(d.getMonth() - 1); return d.toISOString().split('T')[0]; }
function formatFecha(iso) {
  if (!iso) return '—';
  const d  = new Date(iso);
  const hoyStr = new Date().toDateString();
  const ayerStr = new Date(Date.now() - 86400000).toDateString();
  const hora = d.toLocaleTimeString('es', { hour: '2-digit', minute: '2-digit' });
  if (d.toDateString() === hoyStr)   return `Hoy, ${hora}`;
  if (d.toDateString() === ayerStr)  return `Ayer, ${hora}`;
  return d.toLocaleDateString('es', { day: '2-digit', month: 'short' }) + `, ${hora}`;
}

function Trazabilidad() {
  const { token } = useAuth();

  // Filtros
  const [desde,    setDesde]    = useState(haceMes());
  const [hasta,    setHasta]    = useState(hoy());
  const [libroId,  setLibroId]  = useState('');
  const [tipo,     setTipo]     = useState('');

  // Datos
  const [libros,   setLibros]   = useState([]);
  const [data,     setData]     = useState([]);
  const [total,    setTotal]    = useState(0);
  const [page,     setPage]     = useState(1);
  const [cargando, setCargando] = useState(false);
  const [error,    setError]    = useState('');
  const [vista,    setVista]    = useState('tabla'); // 'tabla' | 'timeline'
  
  // Detalle Venta Modal
  const [modalVenta, setModalVenta] = useState(null);
  const [cargandoVenta, setCargandoVenta] = useState(false);

  // Cargar lista de libros para el filtro dropdown
  useEffect(() => {
    apiGetLibros(token).then(setLibros).catch(() => {});
  }, [token]);

  // Cargar movimientos
  const cargar = useCallback(async (pag = 1) => {
    setCargando(true);
    setError('');
    try {
      const res = await apiGetMovimientos(token, {
        desde, hasta, libro_id: libroId, tipo, page: pag, limit: 100,
      });
      setData(res.data);
      setTotal(res.total);
      setPage(pag);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }, [token, desde, hasta, libroId, tipo]);

  useEffect(() => { cargar(1); }, []);

  // ── Ver Detalle de Venta ───────────────────────────────────────
  async function verDetalleVenta(ventaId) {
    setCargandoVenta(true);
    setModalVenta({ id: ventaId }); // Muestra modal con loading
    try {
      const data = await apiGetVentaById(token, ventaId);
      setModalVenta(data);
    } catch (err) {
      alert(err.message);
      setModalVenta(null);
    } finally {
      setCargandoVenta(false);
    }
  }

  // ── Exportar Excel ─────────────────────────────────────────────
  async function exportarExcel() {
    const { exportarExcel: exp } = await import('../hooks/useExport');
    exp(
      data.map(r => ({
        Fecha: formatFecha(r.creado_en),
        Código: r.codigo_barras,
        Título: r.titulo,
        Tipo: r.tipo_movimiento,
        Cantidad: r.cantidad,
        'Saldo Anterior': r.saldo_anterior,
        'Saldo Resultante': r.saldo_resultante,
        Usuario: r.usuario_nombre,
      })),
      `kardex_${desde}_${hasta}`
    );
  }

  // ── Exportar PDF ───────────────────────────────────────────────
  async function exportarPDF() {
    const { exportarPDF: exp } = await import('../hooks/useExport');
    exp(
      ['Fecha', 'Código', 'Título', 'Tipo', 'Cant.', 'S.Anterior', 'S.Resultante', 'Usuario'],
      data.map(r => [
        formatFecha(r.creado_en), r.codigo_barras, r.titulo,
        r.tipo_movimiento, r.cantidad, r.saldo_anterior, r.saldo_resultante, r.usuario_nombre,
      ]),
      `Kardex ${desde} — ${hasta}`,
      `kardex_${desde}_${hasta}`
    );
  }

  const totalPags = Math.ceil(total / 100);

  return (
    <AppLayout>
      <div className="trazabilidad">
        {/* ── Encabezado ──────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Trazabilidad</h1>
            <p className="page-subtitle">
              {cargando ? 'Cargando...' : `${total} registros encontrados`}
            </p>
          </div>
          <div className="trz-header-actions">
            {/* Toggle vista */}
            <div className="toggle-view">
              <button
                className={`toggle-view__btn ${vista === 'tabla' ? 'toggle-view__btn--active' : ''}`}
                onClick={() => setVista('tabla')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <rect x="1" y="1" width="12" height="3" rx="1" fill="currentColor"/>
                  <rect x="1" y="5.5" width="12" height="3" rx="1" fill="currentColor"/>
                  <rect x="1" y="10" width="12" height="3" rx="1" fill="currentColor"/>
                </svg>
                Kardex
              </button>
              <button
                className={`toggle-view__btn ${vista === 'timeline' ? 'toggle-view__btn--active' : ''}`}
                onClick={() => setVista('timeline')}
              >
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <circle cx="3" cy="2" r="1.5" fill="currentColor"/>
                  <circle cx="3" cy="7" r="1.5" fill="currentColor"/>
                  <circle cx="3" cy="12" r="1.5" fill="currentColor"/>
                  <path d="M5 2h8M5 7h8M5 12h8" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
                </svg>
                Línea de tiempo
              </button>
            </div>
            {/* Exportar */}
            <div className="export-dropdown">
              <button className="btn-outline btn-export" id="btn-exportar">
                <svg width="14" height="14" viewBox="0 0 14 14" fill="none">
                  <path d="M7 1v8M4 6l3 3 3-3M2 11h10" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round" strokeLinejoin="round"/>
                </svg>
                Exportar
              </button>
              <div className="export-menu">
                <button onClick={exportarExcel} id="btn-export-excel">📊 Excel (.xlsx)</button>
                <button onClick={exportarPDF}   id="btn-export-pdf">📄 PDF</button>
              </div>
            </div>
          </div>
        </div>

        {/* ── Filtros ──────────────────────────────────────────── */}
        <div className="trz-filters">
          <div className="filter-group">
            <label className="filter-label">Desde</label>
            <input type="date" className="filter-input" value={desde}
              onChange={e => setDesde(e.target.value)} max={hasta} />
          </div>
          <div className="filter-group">
            <label className="filter-label">Hasta</label>
            <input type="date" className="filter-input" value={hasta}
              onChange={e => setHasta(e.target.value)} min={desde} />
          </div>
          <div className="filter-group">
            <label className="filter-label">Libro</label>
            <select className="filter-input" value={libroId}
              onChange={e => setLibroId(e.target.value)}>
              <option value="">Todos</option>
              {libros.map(l => (
                <option key={l.id} value={l.id}>{l.titulo}</option>
              ))}
            </select>
          </div>
          <div className="filter-group">
            <label className="filter-label">Tipo</label>
            <select className="filter-input" value={tipo}
              onChange={e => setTipo(e.target.value)}>
              {TIPO_OPCIONES.map(t => (
                <option key={t} value={t}>{t || 'Todos'}</option>
              ))}
            </select>
          </div>
          <button className="btn-primary trz-apply-btn" id="btn-aplicar-filtros"
            onClick={() => cargar(1)} disabled={cargando}>
            {cargando ? '...' : 'Aplicar'}
          </button>
        </div>

        {/* ── Contenido ────────────────────────────────────────── */}
        {cargando ? (
          <div className="trz-loading">
            <div className="loading-spinner" /><span>Cargando registros...</span>
          </div>
        ) : error ? (
          <div className="trz-error">⚠️ {error}
            <button className="btn-outline" onClick={() => cargar(1)}>Reintentar</button>
          </div>
        ) : data.length === 0 ? (
          <div className="trz-empty">
            <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
              <rect x="8" y="8" width="32" height="32" rx="4" stroke="#D1D5DB" strokeWidth="2"/>
              <path d="M16 24h16M16 30h10" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            <p>No hay movimientos para los filtros aplicados</p>
          </div>
        ) : vista === 'tabla' ? (
          /* ── Vista Kardex Técnico ─────────────────────────── */
          <div className="kardex-table-wrap">
            <table className="kardex-table">
              <thead>
                <tr>
                  <th>Fecha y Hora</th>
                  <th>Código</th>
                  <th>Título</th>
                  <th>Tipo</th>
                  <th>Cant.</th>
                  <th>S. Anterior</th>
                  <th>S. Resultante</th>
                  <th>Usuario</th>
                  <th>Referencia</th>
                </tr>
              </thead>
              <tbody>
                {data.map(r => (
                  <tr key={r.id} className="kardex-row">
                    <td className="td-fecha">{formatFecha(r.creado_en)}</td>
                    <td className="td-code">{r.codigo_barras}</td>
                    <td className="td-titulo">{r.titulo}</td>
                    <td>
                      <span className={`tipo-badge tipo-badge--${r.tipo_movimiento.toLowerCase()}`}>
                        {r.tipo_movimiento === 'ENTRADA' ? '↓' : '↑'} {r.tipo_movimiento}
                      </span>
                    </td>
                    <td className="td-num">{r.cantidad}</td>
                    <td className="td-num td-muted">{r.saldo_anterior}</td>
                    <td className="td-num">
                      <StockBadge stock={r.saldo_resultante} />
                    </td>
                    <td className="td-usuario">{r.usuario_nombre}</td>
                    <td className="td-referencia">
                      {r.venta_id ? (
                        <button 
                          className="btn-link-venta"
                          onClick={() => verDetalleVenta(r.venta_id)}
                        >
                          Venta #{r.numero_venta || r.venta_id}
                        </button>
                      ) : (
                        <span className="text-muted">—</span>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          /* ── Vista Línea de Tiempo ────────────────────────── */
          <div className="timeline">
            {data.map((r, i) => (
              <div key={r.id} className="timeline-item">
                <div className={`timeline-dot timeline-dot--${r.tipo_movimiento.toLowerCase()}`}>
                  {r.tipo_movimiento === 'ENTRADA' ? '↓' : '↑'}
                </div>
                {i < data.length - 1 && <div className="timeline-line" />}
                <div className="timeline-card">
                  <div className="timeline-card__header">
                    <span className="timeline-card__time">{formatFecha(r.creado_en)}</span>
                    <span className={`tipo-badge tipo-badge--${r.tipo_movimiento.toLowerCase()}`}>
                      {r.tipo_movimiento}
                    </span>
                  </div>
                  <p className="timeline-card__titulo">{r.titulo}</p>
                  <div className="timeline-card__meta">
                    <span>Cantidad: <strong>{r.cantidad}</strong></span>
                    <span>Stock → <StockBadge stock={r.saldo_resultante} /></span>
                    <span className="tl-usuario">{r.usuario_nombre}</span>
                    {r.venta_id && (
                      <button 
                        className="btn-link-venta"
                        style={{ marginTop: '0.5rem', alignSelf: 'flex-start' }}
                        onClick={() => verDetalleVenta(r.venta_id)}
                      >
                        Venta #{r.numero_venta || r.venta_id}
                      </button>
                    )}
                  </div>
                </div>
              </div>
            ))}
          </div>
        )}

        {/* ── Paginación ───────────────────────────────────────── */}
        {totalPags > 1 && (
          <div className="pagination">
            <button className="pag-btn" disabled={page <= 1}
              onClick={() => cargar(page - 1)}>← Anterior</button>
            <span className="pag-info">Página {page} de {totalPags}</span>
            <button className="pag-btn" disabled={page >= totalPags}
              onClick={() => cargar(page + 1)}>Siguiente →</button>
          </div>
        )}
      </div>

      {/* ── Modal Detalle de Venta ─────────────────────────────── */}
      {modalVenta && (
        <div className="modal-overlay slide-in-top">
          <div className="modal-form venta-modal-lg">
            <div className="modal-form__header">
              <h2>Detalle de Venta {modalVenta.numero_venta ? `#${modalVenta.numero_venta}` : ''}</h2>
              <button className="modal-close" onClick={() => setModalVenta(null)}>✕</button>
            </div>
            
            {cargandoVenta ? (
              <div className="trz-loading" style={{ minHeight: '200px' }}>
                <div className="loading-spinner" /><span>Cargando detalle...</span>
              </div>
            ) : modalVenta.items ? (
              <div className="venta-detalle-content">
                <div className="vd-info-grid">
                  <div className="vd-info-item">
                    <span className="vd-label">Fecha</span>
                    <span className="vd-val">{formatFecha(modalVenta.creado_en)}</span>
                  </div>
                  <div className="vd-info-item">
                    <span className="vd-label">Cliente</span>
                    <span className="vd-val">{modalVenta.cliente_nombre || 'Público General'}</span>
                  </div>
                  <div className="vd-info-item">
                    <span className="vd-label">Total</span>
                    <span className="vd-val">{modalVenta.precio_total ? `S/ ${modalVenta.precio_total}` : '—'}</span>
                  </div>
                  <div className="vd-info-item">
                    <span className="vd-label">Vendedor</span>
                    <span className="vd-val">{modalVenta.usuario_nombre}</span>
                  </div>
                </div>

                <h3 className="vd-subtitle">Items Vendidos ({modalVenta.total_items})</h3>
                <div className="vd-items-lista">
                  <table className="kardex-table">
                    <thead>
                      <tr>
                        <th>Libro</th>
                        <th>Código</th>
                        <th style={{ textAlign: 'center' }}>Cantidad</th>
                      </tr>
                    </thead>
                    <tbody>
                      {modalVenta.items.map((item, idx) => (
                        <tr key={idx}>
                          <td>{item.titulo}</td>
                          <td className="td-code">{item.codigo_barras}</td>
                          <td style={{ textAlign: 'center' }}><strong>{item.cantidad}</strong></td>
                        </tr>
                      ))}
                    </tbody>
                  </table>
                </div>
                
                <div className="modal-form__footer" style={{ marginTop: '1.5rem' }}>
                  <button className="btn-primary" onClick={() => setModalVenta(null)}>Cerrar</button>
                </div>
              </div>
            ) : (
              <div className="trz-error">No se pudo cargar la información de la venta.</div>
            )}
          </div>
        </div>
      )}
    </AppLayout>
  );
}

export default Trazabilidad;
