import StockBadge from './StockBadge';
import './BookCard.css';

const PLACEHOLDER_IMG = "data:image/svg+xml,%3Csvg xmlns='http://www.w3.org/2000/svg' width='200' height='280' viewBox='0 0 200 280'%3E%3Crect width='200' height='280' fill='%23EEF2FF'/%3E%3Crect x='40' y='60' width='120' height='8' rx='4' fill='%23C7D2FE'/%3E%3Crect x='55' y='80' width='90' height='6' rx='3' fill='%23C7D2FE'/%3E%3Crect x='55' y='100' width='90' height='6' rx='3' fill='%23C7D2FE'/%3E%3Crect x='70' y='130' width='60' height='80' rx='8' fill='%234F46E5' opacity='0.15'/%3E%3Cpath d='M85 155 L100 145 L115 155 L115 210 L85 210Z' fill='%234F46E5' opacity='0.3'/%3E%3C/svg%3E";

/**
 * BookCard — Tarjeta visual para la vista galería del inventario
 * Props:
 *   libro: { id, titulo, foto_url, stock_actual, codigo_barras }
 *   onEditar: (libro) => void
 *   onBorrar: (libro) => void
 */
function BookCard({ libro, onEditar, onBorrar }) {
  return (
    <div className="book-card" role="article">
      {/* Imagen de portada */}
      <div className="book-card__image-wrap">
        <img
          src={libro.foto_url || PLACEHOLDER_IMG}
          alt={`Portada de ${libro.titulo}`}
          className="book-card__image"
          loading="lazy"
          onError={(e) => { e.target.src = PLACEHOLDER_IMG; }}
        />
        {/* Overlay de acciones al hover */}
        <div className="book-card__overlay">
          <button
            className="book-card__action book-card__action--edit"
            onClick={() => onEditar(libro)}
            title="Editar libro"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M11.333 2a1.886 1.886 0 012.667 2.667L4.667 14H2v-2.667L11.333 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
            </svg>
            Editar
          </button>
          <button
            className="book-card__action book-card__action--delete"
            onClick={() => onBorrar(libro)}
            title="Eliminar libro"
          >
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M2 4h12M5.333 4V2.667h5.334V4M6.667 7.333v4M9.333 7.333v4M3.333 4l.667 9.333h8L12.667 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
            </svg>
            Borrar
          </button>
        </div>
      </div>

      {/* Info */}
      <div className="book-card__body">
        <p className="book-card__code">{libro.codigo_barras}</p>
        <h3 className="book-card__title" title={libro.titulo}>{libro.titulo}</h3>
        <div className="book-card__footer">
          <StockBadge stock={libro.stock_actual} />
          <span className="book-card__stock-label">unidades</span>
        </div>
      </div>
    </div>
  );
}

export default BookCard;
