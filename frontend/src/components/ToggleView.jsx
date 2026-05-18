import './ToggleView.css';

/**
 * ToggleView — Botón de alternancia entre vista Tabla y Galería
 * Props:
 *   vista: 'tabla' | 'galeria'
 *   onCambiar: (nuevaVista: string) => void
 */
function ToggleView({ vista, onCambiar }) {
  return (
    <div className="toggle-view" role="group" aria-label="Cambiar vista">
      <button
        id="btn-vista-tabla"
        className={`toggle-view__btn ${vista === 'tabla' ? 'toggle-view__btn--active' : ''}`}
        onClick={() => onCambiar('tabla')}
        title="Vista tabla"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="14" height="3" rx="1" fill="currentColor" opacity="0.9"/>
          <rect x="1" y="6" width="14" height="3" rx="1" fill="currentColor" opacity="0.9"/>
          <rect x="1" y="11" width="14" height="3" rx="1" fill="currentColor" opacity="0.9"/>
        </svg>
        Tabla
      </button>
      <button
        id="btn-vista-galeria"
        className={`toggle-view__btn ${vista === 'galeria' ? 'toggle-view__btn--active' : ''}`}
        onClick={() => onCambiar('galeria')}
        title="Vista galería"
      >
        <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
          <rect x="1" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
          <rect x="9" y="1" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
          <rect x="1" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
          <rect x="9" y="9" width="6" height="6" rx="1.5" fill="currentColor" opacity="0.9"/>
        </svg>
        Galería
      </button>
    </div>
  );
}

export default ToggleView;
