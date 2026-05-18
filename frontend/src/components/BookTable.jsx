import { useState } from 'react';
import StockBadge from './StockBadge';
import './BookTable.css';

const COLUMNAS = [
  { key: 'codigo_barras', label: 'Código de Barras' },
  { key: 'titulo',        label: 'Título' },
  { key: 'stock_actual',  label: 'Stock' },
];

/**
 * BookTable — Tabla de inventario con ordenamiento por columna
 * Props:
 *   libros: array de libros
 *   onEditar: (libro) => void
 *   onBorrar: (libro) => void
 */
function BookTable({ libros, onEditar, onBorrar }) {
  const [sortKey, setSortKey]   = useState('titulo');
  const [sortDir, setSortDir]   = useState('asc'); // 'asc' | 'desc'

  function handleSort(key) {
    if (sortKey === key) {
      setSortDir(d => d === 'asc' ? 'desc' : 'asc');
    } else {
      setSortKey(key);
      setSortDir('asc');
    }
  }

  const sorted = [...libros].sort((a, b) => {
    let av = a[sortKey];
    let bv = b[sortKey];
    if (typeof av === 'string') av = av.toLowerCase();
    if (typeof bv === 'string') bv = bv.toLowerCase();
    if (av < bv) return sortDir === 'asc' ? -1 : 1;
    if (av > bv) return sortDir === 'asc' ? 1 : -1;
    return 0;
  });

  const SortIcon = ({ col }) => {
    if (sortKey !== col) {
      return (
        <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="sort-icon sort-icon--neutral">
          <path d="M6 2v8M3 5l3-3 3 3M3 7l3 3 3-3" stroke="currentColor" strokeWidth="1.2" strokeLinecap="round"/>
        </svg>
      );
    }
    return sortDir === 'asc' ? (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="sort-icon sort-icon--active">
        <path d="M6 9V3M3 6l3-3 3 3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    ) : (
      <svg width="12" height="12" viewBox="0 0 12 12" fill="none" className="sort-icon sort-icon--active">
        <path d="M6 3v6M3 6l3 3 3-3" stroke="currentColor" strokeWidth="1.4" strokeLinecap="round"/>
      </svg>
    );
  };

  if (libros.length === 0) {
    return (
      <div className="book-table-empty">
        <svg width="48" height="48" viewBox="0 0 48 48" fill="none">
          <rect x="8" y="8" width="32" height="32" rx="4" stroke="#D1D5DB" strokeWidth="2"/>
          <path d="M16 24h16M16 30h10" stroke="#D1D5DB" strokeWidth="2" strokeLinecap="round"/>
        </svg>
        <p>No se encontraron libros</p>
      </div>
    );
  }

  return (
    <div className="book-table-wrap">
      <table className="book-table">
        <thead>
          <tr>
            {COLUMNAS.map(col => (
              <th
                key={col.key}
                className="book-table__th"
                onClick={() => handleSort(col.key)}
                aria-sort={sortKey === col.key ? (sortDir === 'asc' ? 'ascending' : 'descending') : 'none'}
              >
                <span className="book-table__th-inner">
                  {col.label}
                  <SortIcon col={col.key} />
                </span>
              </th>
            ))}
            <th className="book-table__th book-table__th--actions">Acciones</th>
          </tr>
        </thead>
        <tbody>
          {sorted.map(libro => (
            <tr key={libro.id} className="book-table__row">
              <td className="book-table__td book-table__td--code">
                {libro.codigo_barras}
              </td>
              <td className="book-table__td book-table__td--title">
                {libro.titulo}
                {libro.descripcion && (
                  <span className="book-table__desc">{libro.descripcion}</span>
                )}
              </td>
              <td className="book-table__td">
                <StockBadge stock={libro.stock_actual} />
              </td>
              <td className="book-table__td book-table__td--actions">
                <button
                  className="table-action table-action--edit"
                  onClick={() => onEditar(libro)}
                  title="Editar"
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M11.333 2a1.886 1.886 0 012.667 2.667L4.667 14H2v-2.667L11.333 2z" stroke="currentColor" strokeWidth="1.5" strokeLinejoin="round"/>
                  </svg>
                  Editar
                </button>
                <button
                  className="table-action table-action--delete"
                  onClick={() => onBorrar(libro)}
                  title="Eliminar"
                >
                  <svg width="15" height="15" viewBox="0 0 16 16" fill="none">
                    <path d="M2 4h12M5.333 4V2.667h5.334V4M3.333 4l.667 9.333h8L12.667 4" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                  </svg>
                  Borrar
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

export default BookTable;
