import { useState, useEffect } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import {
  apiCrearLibro,
  apiEditarLibro,
  apiGetLibroById,
  subirImagenCloudinary,
} from '../api/libros.api';
import { apiAjustarStock } from '../api/movimientos.api';
import AppLayout from '../components/AppLayout';
import './FormularioLibro.css';

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%23EEF2FF'/%3E%3Crect x='70' y='100' width='60' height='80' rx='8' fill='%234F46E5' opacity='0.2'/%3E%3Cpath d='M85 125 L100 115 L115 125 L115 180 L85 180Z' fill='%234F46E5' opacity='0.35'/%3E%3C/svg%3E";

/**
 * FormularioLibro — Pantalla de Nuevo Producto y Editar Producto
 * Si la URL tiene :id → modo edición; si no → modo nuevo.
 */
function FormularioLibro() {
  const { token }  = useAuth();
  const navigate   = useNavigate();
  const { id }     = useParams();             // undefined si es modo Nuevo
  const modoEditar = Boolean(id);

  // ── Campos del formulario ─────────────────────────────────────
  const [codigoBarras,   setCodigoBarras]   = useState('');
  const [titulo,         setTitulo]         = useState('');
  const [descripcion,    setDescripcion]    = useState('');
  const [fotoUrl,        setFotoUrl]        = useState('');
  const [stockInicial,   setStockInicial]   = useState(0);

  // ── Estados de Ajuste de Stock (solo edición) ─────────────────
  const [stockActualUI, setStockActualUI] = useState(null); // stock guardado en bd
  const [ajusteTipo, setAjusteTipo] = useState('ENTRADA');
  const [ajusteCantidad, setAjusteCantidad] = useState(1);
  const [ajusteMotivo, setAjusteMotivo] = useState('');
  const [ajusteLoading, setAjusteLoading] = useState(false);
  const [ajusteMsg, setAjusteMsg] = useState({ text: '', type: '' });

  // ── Estados de UI ─────────────────────────────────────────────
  const [cargandoPagina, setCargandoPagina] = useState(modoEditar);
  const [subiendoImagen, setSubiendoImagen] = useState(false);
  const [guardando,      setGuardando]      = useState(false);
  const [errores,        setErrores]        = useState({});
  const [errorGlobal,    setErrorGlobal]    = useState('');

  // ── Si es modo edición, cargar datos del libro ─────────────────
  useEffect(() => {
    if (!modoEditar) return;
    (async () => {
      try {
        const libro = await apiGetLibroById(token, id);
        setCodigoBarras(libro.codigo_barras);
        setTitulo(libro.titulo);
        setDescripcion(libro.descripcion || '');
        setFotoUrl(libro.foto_url || '');
        setStockActualUI(libro.stock_actual);
      } catch (err) {
        setErrorGlobal(err.message);
      } finally {
        setCargandoPagina(false);
      }
    })();
  }, [id]);

  // ── Validaciones ───────────────────────────────────────────────
  function validar() {
    const errs = {};
    if (!codigoBarras.trim()) {
      errs.codigoBarras = 'El código de barras es requerido';
    } else if (!/^[\d\-a-zA-Z]+$/.test(codigoBarras.trim())) {
      errs.codigoBarras = 'Solo se permiten números, letras y guiones';
    }
    if (!titulo.trim()) {
      errs.titulo = 'El título es requerido';
    } else if (titulo.trim().length < 3) {
      errs.titulo = 'El título debe tener al menos 3 caracteres';
    }
    if (!modoEditar) {
      const s = parseInt(stockInicial, 10);
      if (isNaN(s) || s < 0) errs.stockInicial = 'Debe ser un número entero ≥ 0';
    }
    return errs;
  }

  // ── Subida de imagen a Cloudinary ──────────────────────────────
  async function handleImagenChange(e) {
    const archivo = e.target.files?.[0];
    if (!archivo) return;

    // Preview inmediato local
    const localUrl = URL.createObjectURL(archivo);
    setFotoUrl(localUrl);
    setSubiendoImagen(true);

    try {
      const url = await subirImagenCloudinary(archivo);
      setFotoUrl(url);
    } catch (err) {
      setErrores(prev => ({ ...prev, foto: `Error al subir imagen: ${err.message}` }));
      setFotoUrl('');
    } finally {
      setSubiendoImagen(false);
    }
  }

  // ── Submit ─────────────────────────────────────────────────────
  async function handleSubmit(e) {
    e.preventDefault();
    setErrorGlobal('');
    const errs = validar();
    if (Object.keys(errs).length > 0) {
      setErrores(errs);
      return;
    }
    setErrores({});
    setGuardando(true);

    try {
      if (modoEditar) {
        await apiEditarLibro(token, id, {
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          foto_url: fotoUrl || null,
        });
      } else {
        await apiCrearLibro(token, {
          codigo_barras: codigoBarras.trim(),
          titulo: titulo.trim(),
          descripcion: descripcion.trim() || null,
          foto_url: fotoUrl || null,
          stock_inicial: parseInt(stockInicial, 10) || 0,
        });
      }
      navigate('/inventario');
    } catch (err) {
      if (err.message.includes('código de barras ya existe')) {
        setErrores({ codigoBarras: err.message });
      } else {
        setErrorGlobal(err.message);
      }
    } finally {
      setGuardando(false);
    }
  }

  // ── Ajuste de Stock Independiente ─────────────────────────────
  async function handleAjusteStock(e) {
    e.preventDefault();
    if (!modoEditar || !id) return;
    
    const qty = parseInt(ajusteCantidad, 10);
    if (isNaN(qty) || qty < 1) {
      setAjusteMsg({ text: 'La cantidad debe ser mayor o igual a 1', type: 'error' });
      return;
    }
    
    setAjusteLoading(true);
    setAjusteMsg({ text: '', type: '' });
    try {
      const res = await apiAjustarStock(token, {
        libro_id: parseInt(id, 10),
        tipo: ajusteTipo,
        cantidad: qty,
        observacion: ajusteMotivo
      });
      setStockActualUI(res.stock_nuevo);
      setAjusteMsg({ text: 'Stock actualizado correctamente', type: 'success' });
      setAjusteCantidad(1);
      setAjusteMotivo('');
    } catch (err) {
      setAjusteMsg({ text: err.message, type: 'error' });
    } finally {
      setAjusteLoading(false);
      setTimeout(() => setAjusteMsg({ text: '', type: '' }), 5000);
    }
  }

  if (cargandoPagina) {
    return (
      <AppLayout>
        <div className="form-loading">
          <div className="loading-spinner" />
          <span>Cargando libro...</span>
        </div>
      </AppLayout>
    );
  }

  return (
    <AppLayout>
      <div className="formulario-libro">
        {/* Cabecera */}
        <div className="page-header">
          <div>
            <button className="btn-back" onClick={() => navigate('/inventario')}>
              <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                <path d="M10 3L5 8l5 5" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
              </svg>
              Volver al inventario
            </button>
            <h1 className="page-title" style={{ marginTop: 10 }}>
              {modoEditar ? 'Editar Libro' : 'Nuevo Libro'}
            </h1>
          </div>
        </div>

        {errorGlobal && (
          <div className="form-error-global">⚠️ {errorGlobal}</div>
        )}

        <form onSubmit={handleSubmit} className="libro-form" noValidate>
          {/* Columna izquierda — campos */}
          <div className="libro-form__fields">
            <div className="form-section">
              <h2 className="form-section__title">Información del libro</h2>

              {/* Código de barras */}
              <div className="form-group">
                <label className="form-label" htmlFor="input-codigo">
                  Código de barras <span className="required">*</span>
                </label>
                <input
                  id="input-codigo"
                  type="text"
                  className={`form-input ${errores.codigoBarras ? 'form-input--error' : ''}`}
                  value={codigoBarras}
                  onChange={e => { setCodigoBarras(e.target.value); setErrores(p => ({...p, codigoBarras: ''})); }}
                  placeholder="978-0-14-028329-7"
                  disabled={modoEditar} /* El código no se edita */
                  autoFocus={!modoEditar}
                />
                {errores.codigoBarras && <span className="field-error">{errores.codigoBarras}</span>}
                {modoEditar && <span className="field-hint">El código de barras no puede modificarse</span>}
              </div>

              {/* Título */}
              <div className="form-group">
                <label className="form-label" htmlFor="input-titulo">
                  Título <span className="required">*</span>
                </label>
                <input
                  id="input-titulo"
                  type="text"
                  className={`form-input ${errores.titulo ? 'form-input--error' : ''}`}
                  value={titulo}
                  onChange={e => { setTitulo(e.target.value); setErrores(p => ({...p, titulo: ''})); }}
                  placeholder="El nombre del libro"
                  autoFocus={modoEditar}
                />
                {errores.titulo && <span className="field-error">{errores.titulo}</span>}
              </div>

              {/* Descripción */}
              <div className="form-group">
                <label className="form-label" htmlFor="input-descripcion">
                  Descripción <span className="optional">(opcional)</span>
                </label>
                <textarea
                  id="input-descripcion"
                  className="form-textarea"
                  value={descripcion}
                  onChange={e => setDescripcion(e.target.value)}
                  placeholder="Autor, editorial, año, notas..."
                  rows={4}
                />
              </div>

              {/* Stock inicial — solo en modo Nuevo */}
              {!modoEditar && (
                <div className="form-group">
                  <label className="form-label" htmlFor="input-stock">
                    Stock inicial
                  </label>
                  <input
                    id="input-stock"
                    type="number"
                    min="0"
                    className={`form-input form-input--number ${errores.stockInicial ? 'form-input--error' : ''}`}
                    value={stockInicial}
                    onChange={e => { setStockInicial(e.target.value); setErrores(p => ({...p, stockInicial: ''})); }}
                  />
                  {errores.stockInicial && <span className="field-error">{errores.stockInicial}</span>}
                  <span className="field-hint">
                    Si es mayor a 0, se registrará una entrada en el kardex automáticamente
                  </span>
                </div>
              )}
            </div>
          </div>

          {/* Columna derecha — foto */}
          <div className="libro-form__preview">
            <div className="form-section">
              <h2 className="form-section__title">Foto de portada</h2>

              <div className="image-upload">
                {/* Preview */}
                <div className="image-preview">
                  {subiendoImagen && (
                    <div className="image-preview__overlay">
                      <div className="loading-spinner" />
                    </div>
                  )}
                  <img
                    src={fotoUrl || PLACEHOLDER_IMG}
                    alt="Preview de portada"
                    className="image-preview__img"
                    onError={e => { e.target.src = PLACEHOLDER_IMG; }}
                  />
                </div>

                <label htmlFor="input-foto" className="btn-upload">
                  <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
                    <path d="M8 11V3M5 6l3-3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                    <path d="M2 13h12" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                  </svg>
                  {subiendoImagen ? 'Subiendo...' : 'Seleccionar foto'}
                </label>
                <input
                  id="input-foto"
                  type="file"
                  accept="image/*"
                  className="input-file-hidden"
                  onChange={handleImagenChange}
                  disabled={subiendoImagen}
                />
                {errores.foto && <span className="field-error">{errores.foto}</span>}
                <span className="field-hint" style={{ textAlign: 'center' }}>
                  JPG, PNG o WEBP. La imagen se sube a Cloudinary.
                </span>
              </div>
            </div>
          </div>
        </form>

        {/* Panel Ajuste de Stock (Solo Edición) */}
        {modoEditar && (
          <div className="ajuste-stock-panel">
            <h2 className="form-section__title">Ajuste de Stock</h2>
            <div className="stock-info">
              <span>Stock actual:</span>
              <span className={`stock-badge ${stockActualUI > 10 ? 'stock-high' : stockActualUI > 0 ? 'stock-medium' : 'stock-low'}`}>
                {stockActualUI}
              </span>
            </div>
            
            <form className="ajuste-form" onSubmit={handleAjusteStock}>
              <div className="ajuste-grid">
                <div className="form-group">
                  <label className="form-label">Tipo de ajuste</label>
                  <select 
                    className="form-input" 
                    value={ajusteTipo} 
                    onChange={e => setAjusteTipo(e.target.value)}
                  >
                    <option value="ENTRADA">Entrada (sumar unidades)</option>
                    <option value="AJUSTE">Salida (restar unidades)</option>
                  </select>
                </div>
                <div className="form-group">
                  <label className="form-label">Cantidad a ajustar</label>
                  <input 
                    type="number" 
                    className="form-input" 
                    min="1" 
                    value={ajusteCantidad}
                    onChange={e => setAjusteCantidad(e.target.value)}
                  />
                </div>
              </div>
              <div className="form-group" style={{ marginTop: '1rem' }}>
                <label className="form-label">Motivo (opcional)</label>
                <input 
                  type="text" 
                  className="form-input" 
                  placeholder="Ej: Corrección de inventario manual"
                  value={ajusteMotivo}
                  onChange={e => setAjusteMotivo(e.target.value)}
                />
              </div>
              
              {ajusteMsg.text && (
                <div className={`ajuste-msg ${ajusteMsg.type}`}>
                  {ajusteMsg.text}
                </div>
              )}
              
              <button 
                type="submit" 
                className="btn-ajuste" 
                disabled={ajusteLoading}
                style={{ marginTop: '1rem' }}
              >
                {ajusteLoading ? 'Aplicando...' : 'Aplicar Ajuste de Stock'}
              </button>
            </form>
          </div>
        )}

        {/* Botones de acción */}
        <div className="form-actions">
          <button
            type="button"
            className="btn-outline"
            onClick={() => navigate('/inventario')}
            disabled={guardando}
          >
            Cancelar
          </button>
          <button
            id="btn-guardar-libro"
            type="submit"
            className="btn-primary"
            onClick={handleSubmit}
            disabled={guardando || subiendoImagen}
          >
            {guardando ? (
              <><span className="btn-spinner-sm" />{modoEditar ? 'Guardando...' : 'Creando...'}</>
            ) : modoEditar ? 'Guardar cambios' : 'Crear Libro'}
          </button>
        </div>
      </div>
    </AppLayout>
  );
}

export default FormularioLibro;
