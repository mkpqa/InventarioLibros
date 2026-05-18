import { getStockColor, getStockLabel } from '../hooks/useStockColor';
import './StockBadge.css';

/**
 * StockBadge — Semáforo visual de stock
 * Props: { stock: number }
 * Renderiza un badge pill con color según el umbral de stock.
 */
function StockBadge({ stock }) {
  const colorClass = getStockColor(stock);
  const label      = getStockLabel(stock);

  return (
    <span className={`stock-badge ${colorClass}`} title={label}>
      {stock}
    </span>
  );
}

export default StockBadge;
