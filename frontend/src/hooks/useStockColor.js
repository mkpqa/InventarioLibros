/**
 * useStockColor.js
 * Lógica del semáforo de stock según umbrales del plan maestro.
 *
 * Umbrales:
 *   > 50         → stock-verde   (verde)
 *   >= 15 y <=50 → stock-amarillo (ámbar)
 *   < 15         → stock-rojo    (rojo)
 */
export function getStockColor(stock) {
  if (stock > 50)              return 'stock-verde';
  if (stock >= 15 && stock <= 50) return 'stock-amarillo';
  return 'stock-rojo';
}

export function getStockLabel(stock) {
  if (stock > 50)              return 'En stock';
  if (stock >= 15 && stock <= 50) return 'Stock bajo';
  return 'Crítico';
}

/**
 * Hook por si se necesita reactividad futura.
 * Por ahora las funciones puras son suficientes.
 */
export function useStockColor(stock) {
  return {
    colorClass: getStockColor(stock),
    label: getStockLabel(stock),
  };
}
