import './ConfirmModal.css';

/**
 * ConfirmModal — Overlay de confirmación de borrado
 * Props:
 *   titulo: string
 *   mensaje: string
 *   onConfirmar: () => void
 *   onCancelar: () => void
 *   cargando: boolean
 */
function ConfirmModal({ titulo, mensaje, onConfirmar, onCancelar, cargando = false }) {
  return (
    <div className="modal-overlay" role="dialog" aria-modal="true" aria-labelledby="modal-title">
      <div className="modal">
        <div className="modal__icon">
          <svg width="28" height="28" viewBox="0 0 28 28" fill="none">
            <circle cx="14" cy="14" r="13" stroke="#BA1A1A" strokeWidth="1.5"/>
            <path d="M14 9v6M14 18v1" stroke="#BA1A1A" strokeWidth="2" strokeLinecap="round"/>
          </svg>
        </div>
        <h2 id="modal-title" className="modal__title">{titulo}</h2>
        <p className="modal__message">{mensaje}</p>
        <div className="modal__actions">
          <button
            className="modal__btn modal__btn--cancel"
            onClick={onCancelar}
            disabled={cargando}
          >
            Cancelar
          </button>
          <button
            id="btn-confirmar-borrar"
            className="modal__btn modal__btn--danger"
            onClick={onConfirmar}
            disabled={cargando}
          >
            {cargando ? (
              <><span className="btn-spinner-sm" />Eliminando...</>
            ) : 'Sí, eliminar'}
          </button>
        </div>
      </div>
    </div>
  );
}

export default ConfirmModal;
