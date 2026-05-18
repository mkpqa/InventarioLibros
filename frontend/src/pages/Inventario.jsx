import { useState, useEffect, useMemo } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../context/AuthContext';
import { apiGetLibros, apiEliminarLibro } from '../api/libros.api';
import AppLayout from '../components/AppLayout';
import BookTable from '../components/BookTable';
import BookCard from '../components/BookCard';
import ToggleView from '../components/ToggleView';
import ConfirmModal from '../components/ConfirmModal';
import './Inventario.css';

function Inventario() {
  const { token } = useAuth();
  const navigate  = useNavigate();

  const [libros,         setLibros]         = useState([]);
  const [cargando,       setCargando]       = useState(true);
  const [error,          setError]          = useState('');
  const [busqueda,       setBusqueda]       = useState('');
  const [vista,          setVista]          = useState('tabla');
  const [libroABorrar,   setLibroABorrar]   = useState(null);
  const [borrando,       setBorrando]       = useState(false);
  const [toastMsg,       setToastMsg]       = useState('');

  // Cargar libros al montar
  useEffect(() => {
    cargarLibros();
  }, []);

  async function cargarLibros() {
    setCargando(true);
    setError('');
    try {
      const data = await apiGetLibros(token);
      setLibros(data);
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  // Filtrado local por búsqueda (título o código de barras)
  const librosFiltrados = useMemo(() => {
    if (!busqueda.trim()) return libros;
    const q = busqueda.toLowerCase();
    return libros.filter(l =>
      l.titulo.toLowerCase().includes(q) ||
      l.codigo_barras.toLowerCase().includes(q)
    );
  }, [libros, busqueda]);

  function mostrarToast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  async function confirmarBorrado() {
    if (!libroABorrar) return;
    setBorrando(true);
    try {
      await apiEliminarLibro(token, libroABorrar.id);
      setLibros(prev => prev.filter(l => l.id !== libroABorrar.id));
      mostrarToast(`"${libroABorrar.titulo}" eliminado del catálogo`);
    } catch (err) {
      mostrarToast(`Error: ${err.message}`);
    } finally {
      setBorrando(false);
      setLibroABorrar(null);
    }
  }

  return (
    <AppLayout>
      <div className="inventario">
        {/* Encabezado de página */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Inventario</h1>
            <p className="page-subtitle">
              {cargando ? 'Cargando...' : `${librosFiltrados.length} de ${libros.length} libros`}
            </p>
          </div>
          <button
            id="btn-nuevo-libro"
            className="btn-primary"
            onClick={() => navigate('/inventario/nuevo')}
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Añadir Libro
          </button>
        </div>

        {/* Barra de acciones */}
        <div className="inventario__toolbar">
          <div className="search-wrap">
            <svg className="search-icon" width="16" height="16" viewBox="0 0 16 16" fill="none">
              <circle cx="7" cy="7" r="5" stroke="#9CA3AF" strokeWidth="1.5"/>
              <path d="M11 11l3 3" stroke="#9CA3AF" strokeWidth="1.5" strokeLinecap="round"/>
            </svg>
            <input
              id="input-busqueda"
              type="search"
              className="search-input"
              placeholder="Buscar por título o código de barras..."
              value={busqueda}
              onChange={e => setBusqueda(e.target.value)}
            />
            {busqueda && (
              <button className="search-clear" onClick={() => setBusqueda('')} aria-label="Limpiar">✕</button>
            )}
          </div>
          <ToggleView vista={vista} onCambiar={setVista} />
        </div>

        {/* Contenido */}
        {cargando ? (
          <div className="inventario__loading">
            <div className="loading-spinner" />
            <span>Cargando inventario...</span>
          </div>
        ) : error ? (
          <div className="inventario__error">
            <p>⚠️ {error}</p>
            <button className="btn-outline" onClick={cargarLibros}>Reintentar</button>
          </div>
        ) : vista === 'tabla' ? (
          <BookTable
            libros={librosFiltrados}
            onEditar={libro => navigate(`/inventario/editar/${libro.id}`)}
            onBorrar={setLibroABorrar}
          />
        ) : (
          <div className="book-grid">
            {librosFiltrados.length === 0 ? (
              <div className="book-grid__empty">No se encontraron libros</div>
            ) : librosFiltrados.map(libro => (
              <BookCard
                key={libro.id}
                libro={libro}
                onEditar={libro => navigate(`/inventario/editar/${libro.id}`)}
                onBorrar={setLibroABorrar}
              />
            ))}
          </div>
        )}
      </div>

      {/* Modal de confirmación de borrado */}
      {libroABorrar && (
        <ConfirmModal
          titulo="¿Eliminar libro?"
          mensaje={`"${libroABorrar.titulo}" no aparecerá más en el catálogo, pero su historial se conservará intacto.`}
          onConfirmar={confirmarBorrado}
          onCancelar={() => setLibroABorrar(null)}
          cargando={borrando}
        />
      )}

      {/* Toast de notificación */}
      {toastMsg && (
        <div className="toast" role="status">{toastMsg}</div>
      )}
    </AppLayout>
  );
}

export default Inventario;
