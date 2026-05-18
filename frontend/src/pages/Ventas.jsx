import React, { useState, useEffect, useCallback } from 'react';
import { useAuth } from '../context/AuthContext';
import { apiBuscarLibros } from '../api/libros.api';
import { apiRegistrarVenta } from '../api/ventas.api';
import { Search, ShoppingCart, Plus, Minus, X, CheckCircle, AlertCircle, ShoppingBag } from 'lucide-react';
import AppLayout from '../components/AppLayout';
import './Ventas.css';

export default function Ventas() {
  const { token } = useAuth();
  
  // Estados
  const [busqueda, setBusqueda] = useState('');
  const [resultados, setResultados] = useState([]);
  const [isBuscando, setIsBuscando] = useState(false);
  const [errorBuscador, setErrorBuscador] = useState(null);
  
  const [items, setItems] = useState([]); // [{ libro_id, titulo, stock_actual, cantidad, foto_url }]
  const [clienteNombre, setClienteNombre] = useState('');
  const [precioTotal, setPrecioTotal] = useState('');
  
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [errorVenta, setErrorVenta] = useState(null);
  const [ventaExitosa, setVentaExitosa] = useState(null); // Guardará el numero_venta

  // Debounce Búsqueda
  useEffect(() => {
    const timer = setTimeout(() => {
      if (busqueda.trim().length >= 1) {
        buscarLibros(busqueda.trim());
      } else {
        setResultados([]);
      }
    }, 300); // 300ms debounce
    return () => clearTimeout(timer);
  }, [busqueda]);

  const buscarLibros = async (query) => {
    setIsBuscando(true);
    setErrorBuscador(null);
    try {
      const data = await apiBuscarLibros(token, query);
      setResultados(data);
    } catch (err) {
      setErrorBuscador(err.message);
      setResultados([]);
    } finally {
      setIsBuscando(false);
    }
  };

  const getSemaforoColor = (stock) => {
    if (stock > 20) return 'stock-high';
    if (stock > 5) return 'stock-medium';
    return 'stock-low';
  };

  const agregarLibro = (libro) => {
    if (libro.stock_actual <= 0) return; // Validación extra
    
    setItems(prev => {
      const existente = prev.find(i => i.libro_id === libro.id);
      if (existente) {
        if (existente.cantidad >= libro.stock_actual) return prev; // No superar stock
        return prev.map(i => 
          i.libro_id === libro.id ? { ...i, cantidad: i.cantidad + 1 } : i
        );
      } else {
        return [...prev, {
          libro_id: libro.id,
          titulo: libro.titulo,
          stock_actual: libro.stock_actual,
          foto_url: libro.foto_url,
          cantidad: 1
        }];
      }
    });
    setBusqueda(''); // Limpiar buscador tras agregar
  };

  const actualizarCantidad = (libro_id, delta) => {
    setItems(prev => prev.map(item => {
      if (item.libro_id === libro_id) {
        const nuevaCantidad = item.cantidad + delta;
        if (nuevaCantidad >= 1 && nuevaCantidad <= item.stock_actual) {
          return { ...item, cantidad: nuevaCantidad };
        }
      }
      return item;
    }));
  };

  const eliminarItem = (libro_id) => {
    setItems(prev => prev.filter(i => i.libro_id !== libro_id));
  };

  const calcularTotalItems = () => items.reduce((acc, item) => acc + item.cantidad, 0);

  const handleRegistrarVenta = async () => {
    if (items.length === 0) return;
    setIsSubmitting(true);
    setErrorVenta(null);
    
    try {
      const payload = {
        cliente_nombre: clienteNombre.trim() || null,
        precio_total: precioTotal ? parseFloat(precioTotal) : null,
        items: items.map(i => ({ libro_id: i.libro_id, cantidad: i.cantidad }))
      };
      
      const res = await apiRegistrarVenta(token, payload);
      setVentaExitosa(res.numero_venta);
      
      // Limpiar formulario tras el éxito
      setItems([]);
      setClienteNombre('');
      setPrecioTotal('');
      setBusqueda('');
    } catch (err) {
      setErrorVenta(err.message);
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <AppLayout>
      <div className="ventas-container fade-in">
        <header className="ventas-header">
        <div className="header-icon-container">
          <ShoppingBag size={28} className="header-icon" />
        </div>
        <div>
          <h1>Punto de Venta</h1>
          <p>Registra salidas de libros con su respectivo cliente</p>
        </div>
      </header>

      {/* Modal Éxito */}
      {ventaExitosa && (
        <div className="modal-overlay slide-in-top">
          <div className="modal-content success-modal">
            <CheckCircle size={64} className="success-icon bounce" />
            <h2>Venta Registrada Exitosamente</h2>
            <p className="venta-number-badge">#{ventaExitosa}</p>
            <p>El stock y kardex han sido actualizados.</p>
            <button className="btn-primary" onClick={() => setVentaExitosa(null)}>
              Nueva Venta
            </button>
          </div>
        </div>
      )}

      <div className="ventas-grid">
        {/* PANEL IZQUIERDO: BUSCADOR */}
        <section className="panel-buscador card glass-effect">
          <div className="panel-header">
            <Search size={20} />
            <h2>Buscador de Libros</h2>
          </div>
          <div className="search-wrapper">
            <input 
              type="text" 
              placeholder="Buscar por título o código de barras..." 
              value={busqueda}
              onChange={(e) => setBusqueda(e.target.value)}
              className="buscador-input"
              autoFocus
            />
            {isBuscando && <span className="loader-spinner"></span>}
          </div>
          
          {errorBuscador && <div className="error-msg"><AlertCircle size={16}/> {errorBuscador}</div>}

          <div className="resultados-lista custom-scrollbar">
            {busqueda.length === 0 && resultados.length === 0 && (
              <div className="empty-state">
                <Search size={40} />
                <p>Empieza a escribir para buscar libros</p>
              </div>
            )}
            {busqueda.length > 0 && resultados.length === 0 && !isBuscando && (
              <div className="empty-state">
                <p>No se encontraron libros</p>
              </div>
            )}
            {resultados.map(libro => {
              const agotado = libro.stock_actual <= 0;
              return (
                <div 
                  key={libro.id} 
                  className={`resultado-item ${agotado ? 'agotado' : ''}`}
                  onClick={() => !agotado && agregarLibro(libro)}
                >
                  <img src={libro.foto_url || '/placeholder-book.png'} alt="Portada" className="res-img" />
                  <div className="res-info">
                    <h4>{libro.titulo}</h4>
                    <p className="res-code">{libro.codigo_barras || 'Sin código'}</p>
                  </div>
                  <div className={`res-stock badge ${getSemaforoColor(libro.stock_actual)}`}>
                    {agotado ? 'Sin Stock' : `Stock: ${libro.stock_actual}`}
                  </div>
                </div>
              );
            })}
          </div>
        </section>

        {/* PANEL CENTRAL: CARRITO */}
        <section className="panel-carrito card glass-effect">
          <div className="panel-header">
            <ShoppingCart size={20} />
            <h2>Carrito de Venta ({calcularTotalItems()})</h2>
          </div>
          
          <div className="carrito-lista custom-scrollbar">
            {items.length === 0 ? (
              <div className="empty-state">
                <ShoppingBag size={48} className="text-gray-300" />
                <p>No hay libros en el carrito.</p>
                <span>Usa el buscador para agregar items.</span>
              </div>
            ) : (
              items.map(item => (
                <div key={item.libro_id} className="carrito-item slide-in-left">
                  <img src={item.foto_url || '/placeholder-book.png'} alt="Portada" className="car-img" />
                  <div className="car-info">
                    <h4>{item.titulo}</h4>
                    <span className={`badge ${getSemaforoColor(item.stock_actual)}`}>
                      Disponible: {item.stock_actual}
                    </span>
                  </div>
                  
                  <div className="car-controls">
                    <button 
                      className="btn-icon" 
                      onClick={() => actualizarCantidad(item.libro_id, -1)}
                      disabled={item.cantidad <= 1}
                    ><Minus size={16}/></button>
                    <span className="car-cantidad">{item.cantidad}</span>
                    <button 
                      className="btn-icon" 
                      onClick={() => actualizarCantidad(item.libro_id, 1)}
                      disabled={item.cantidad >= item.stock_actual}
                    ><Plus size={16}/></button>
                  </div>
                  
                  <button className="btn-icon danger" onClick={() => eliminarItem(item.libro_id)}>
                    <X size={18} />
                  </button>
                </div>
              ))
            )}
          </div>
        </section>

        {/* PANEL DERECHO: RESUMEN Y CHECKOUT */}
        <section className="panel-resumen card glass-effect">
          <div className="panel-header">
            <h2>Resumen de Operación</h2>
          </div>
          
          <div className="resumen-form">
            <div className="form-group">
              <label>Cliente (Opcional)</label>
              <input 
                type="text" 
                placeholder="Nombre del cliente" 
                value={clienteNombre}
                onChange={e => setClienteNombre(e.target.value)}
              />
            </div>
            <div className="form-group">
              <label>Precio Total (Opcional)</label>
              <div className="input-with-prefix">
                <span className="prefix">S/</span>
                <input 
                  type="number" 
                  step="0.01" 
                  placeholder="0.00" 
                  value={precioTotal}
                  onChange={e => setPrecioTotal(e.target.value)}
                />
              </div>
            </div>
            
            <div className="resumen-totales">
              <div className="totales-row">
                <span>Items distintos:</span>
                <strong>{items.length}</strong>
              </div>
              <div className="totales-row highlight">
                <span>Total Libros:</span>
                <strong>{calcularTotalItems()}</strong>
              </div>
            </div>

            {errorVenta && (
              <div className="error-msg alert-shake">
                <AlertCircle size={16} /> {errorVenta}
              </div>
            )}

            <button 
              className="btn-registrar" 
              disabled={items.length === 0 || isSubmitting}
              onClick={handleRegistrarVenta}
            >
              {isSubmitting ? <span className="loader-spinner white"></span> : 'Registrar Venta'}
            </button>
          </div>
        </section>
      </div>
    </div>
    </AppLayout>
  );
}
