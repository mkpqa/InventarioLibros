import { useState, useEffect } from 'react';
import { useAuth } from '../context/AuthContext';
import {
  apiGetUsuarios, apiCrearUsuario, apiToggleEstado, apiCambiarPassword,
  apiEditarUsuario, apiDesactivarUsuario
} from '../api/usuarios.api';
import AppLayout from '../components/AppLayout';
import ConfirmModal from '../components/ConfirmModal';
import './Usuarios.css';

// ── Form vacío ─────────────────────────────────────────────────
const formVacio = { nombre: '', email: '', password: '', rol: 'operario' };

function Usuarios() {
  const { token, usuario: yo } = useAuth();

  const [usuarios,     setUsuarios]     = useState([]);
  const [cargando,     setCargando]     = useState(true);
  const [error,        setError]        = useState('');
  const [modalNuevo,   setModalNuevo]   = useState(false);
  const [usuarioAEditar, setUsuarioAEditar] = useState(null); // Si no es null, estamos en modo Edición
  const [modalPass,    setModalPass]    = useState(null);  // { id, nombre }
  const [toggleTarget, setToggleTarget] = useState(null);  // { id, nombre, estado }
  const [form,         setForm]         = useState(formVacio);
  const [formPass,     setFormPass]     = useState('');
  const [errores,      setErrores]      = useState({});
  const [guardando,    setGuardando]    = useState(false);
  const [toastMsg,     setToastMsg]     = useState('');

  useEffect(() => { cargar(); }, []);

  async function cargar() {
    setCargando(true);
    setError('');
    try {
      setUsuarios(await apiGetUsuarios(token));
    } catch (err) {
      setError(err.message);
    } finally {
      setCargando(false);
    }
  }

  function toast(msg) {
    setToastMsg(msg);
    setTimeout(() => setToastMsg(''), 3000);
  }

  // ── Crear usuario ──────────────────────────────────────────────
  // ── Crear / Editar usuario ──────────────────────────────────────
  function validarForm() {
    const errs = {};
    if (!form.nombre.trim())            errs.nombre   = 'Nombre requerido';
    if (!form.email.trim())             errs.email    = 'Email requerido';
    else if (!/\S+@\S+\.\S+/.test(form.email)) errs.email = 'Email inválido';
    
    // Si estamos creando, pass requerido. Si estamos editando, opcional.
    if (!usuarioAEditar && !form.password) {
      errs.password = 'Contraseña requerida';
    } else if (form.password && form.password.length < 6) {
      errs.password = 'Mínimo 6 caracteres';
    }
    return errs;
  }

  async function handleCrear(e) {
    e.preventDefault();
    const errs = validarForm();
    if (Object.keys(errs).length) { setErrores(errs); return; }
    setErrores({});
    setGuardando(true);
    try {
      if (usuarioAEditar) {
        // Editar
        const editado = await apiEditarUsuario(token, usuarioAEditar.id, form);
        setUsuarios(prev => prev.map(u => u.id === editado.id ? editado : u));
        toast(`✅ Usuario "${editado.nombre}" actualizado`);
      } else {
        // Crear
        const nuevo = await apiCrearUsuario(token, form);
        setUsuarios(prev => [nuevo, ...prev]);
        toast(`✅ Usuario "${nuevo.nombre}" creado`);
      }
      cerrarModalForm();
    } catch (err) {
      setErrores({ global: err.message });
    } finally {
      setGuardando(false);
    }
  }

  function abrirModalNuevo() {
    setUsuarioAEditar(null);
    setForm(formVacio);
    setErrores({});
    setModalNuevo(true);
  }

  function abrirModalEditar(u) {
    setUsuarioAEditar(u);
    setForm({ nombre: u.nombre, email: u.email, rol: u.rol, password: '' });
    setErrores({});
    setModalNuevo(true);
  }

  function cerrarModalForm() {
    setModalNuevo(false);
    setUsuarioAEditar(null);
    setForm(formVacio);
    setErrores({});
  }

  // ── Toggle estado ──────────────────────────────────────────────
  async function confirmarToggle() {
    if (!toggleTarget) return;
    setGuardando(true);
    try {
      const res = await apiToggleEstado(token, toggleTarget.id);
      setUsuarios(prev =>
        prev.map(u => u.id === res.id ? { ...u, estado_activo: res.estado_activo } : u)
      );
      toast(`Usuario ${res.estado_activo ? 'activado' : 'desactivado'}`);
    } catch (err) {
      toast(`Error: ${err.message}`);
    } finally {
      setGuardando(false);
      setToggleTarget(null);
    }
  }

  // ── Cambiar contraseña ─────────────────────────────────────────
  async function handleCambiarPass(e) {
    e.preventDefault();
    if (formPass.length < 6) { setErrores({ pass: 'Mínimo 6 caracteres' }); return; }
    setErrores({});
    setGuardando(true);
    try {
      await apiCambiarPassword(token, modalPass.id, formPass);
      setModalPass(null);
      setFormPass('');
      toast('✅ Contraseña actualizada');
    } catch (err) {
      setErrores({ pass: err.message });
    } finally {
      setGuardando(false);
    }
  }

  return (
    <AppLayout>
      <div className="usuarios">
        {/* ── Cabecera ─────────────────────────────────────────── */}
        <div className="page-header">
          <div>
            <h1 className="page-title">Usuarios</h1>
            <p className="page-subtitle">{usuarios.length} usuarios registrados</p>
          </div>
          <button id="btn-nuevo-usuario" className="btn-primary" onClick={abrirModalNuevo}>
            <svg width="16" height="16" viewBox="0 0 16 16" fill="none">
              <path d="M8 3v10M3 8h10" stroke="currentColor" strokeWidth="2" strokeLinecap="round"/>
            </svg>
            Nuevo Usuario
          </button>
        </div>

        {/* ── Tabla ────────────────────────────────────────────── */}
        {cargando ? (
          <div className="usuarios-loading">
            <div className="loading-spinner" /><span>Cargando usuarios...</span>
          </div>
        ) : error ? (
          <div className="usuarios-error">⚠️ {error}
            <button className="btn-outline" onClick={cargar}>Reintentar</button>
          </div>
        ) : (
          <div className="usuarios-table-wrap">
            <table className="usuarios-table">
              <thead>
                <tr>
                  <th>Nombre</th>
                  <th>Email</th>
                  <th>Rol</th>
                  <th>Estado</th>
                  <th>Creado</th>
                  <th className="th-actions">Acciones</th>
                </tr>
              </thead>
              <tbody>
                {usuarios.map(u => (
                  <tr key={u.id} className={`usr-row ${!u.estado_activo ? 'usr-row--inactive' : ''}`}>
                    <td className="td-nombre">
                      <div className="usr-avatar">{u.nombre.charAt(0).toUpperCase()}</div>
                      <span>{u.nombre}</span>
                      {u.id === yo?.id && <span className="tag-yo">Tú</span>}
                    </td>
                    <td className="td-email">{u.email}</td>
                    <td>
                      <span className={`rol-badge rol-badge--${u.rol}`}>{u.rol}</span>
                    </td>
                    <td>
                      <span className={`estado-badge ${u.estado_activo ? 'estado-badge--activo' : 'estado-badge--inactivo'}`}>
                        {u.estado_activo ? 'Activo' : 'Inactivo'}
                      </span>
                    </td>
                    <td className="td-fecha">
                      {new Date(u.creado_en).toLocaleDateString('es', { day:'2-digit', month:'short', year:'numeric' })}
                    </td>
                    <td className="td-actions">
                      {/* Editar usuario */}
                      <button
                        className="usr-action"
                        title="Editar usuario"
                        onClick={() => abrirModalEditar(u)}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <path d="M11 3a2 2 0 112.828 2.828L4.828 14.828a2 2 0 01-1.414.586H2v-1.414a2 2 0 01.586-1.414L11 3z" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                        </svg>
                      </button>
                      {/* Cambiar contraseña */}
                      <button
                        className="usr-action usr-action--pass"
                        title="Cambiar contraseña"
                        onClick={() => { setModalPass({ id: u.id, nombre: u.nombre }); setFormPass(''); setErrores({}); }}
                      >
                        <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                          <rect x="3" y="7" width="10" height="8" rx="2" stroke="currentColor" strokeWidth="1.5"/>
                          <path d="M5 7V5a3 3 0 016 0v2" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round"/>
                        </svg>
                      </button>
                      {/* Toggle estado */}
                      {u.id !== yo?.id && (
                        <button
                          className={`usr-action ${u.estado_activo ? 'usr-action--disable' : 'usr-action--enable'}`}
                          title={u.estado_activo ? 'Desactivar' : 'Activar'}
                          onClick={() => setToggleTarget(u)}
                        >
                          {u.estado_activo ? (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M2 8h12M5 5l-3 3 3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          ) : (
                            <svg width="14" height="14" viewBox="0 0 16 16" fill="none">
                              <path d="M2 8h12M11 5l3 3-3 3" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round"/>
                            </svg>
                          )}
                        </button>
                      )}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      {/* ── Modal Nuevo/Editar Usuario ───────────────────────────── */}
      {modalNuevo && (
        <div className="modal-overlay">
          <div className="modal-form">
            <div className="modal-form__header">
              <h2>{usuarioAEditar ? 'Editar usuario' : 'Nuevo usuario'}</h2>
              <button className="modal-close" onClick={cerrarModalForm}>✕</button>
            </div>
            {errores.global && <div className="form-error-global">⚠️ {errores.global}</div>}
            <form onSubmit={handleCrear} noValidate>
              <div className="form-group">
                <label className="form-label">Nombre completo *</label>
                <input className={`form-input ${errores.nombre ? 'form-input--error' : ''}`}
                  value={form.nombre} onChange={e => setForm(p=>({...p, nombre: e.target.value}))}
                  placeholder="Ej: María López" />
                {errores.nombre && <span className="field-error">{errores.nombre}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Email *</label>
                <input type="email" className={`form-input ${errores.email ? 'form-input--error' : ''}`}
                  value={form.email} onChange={e => setForm(p=>({...p, email: e.target.value}))}
                  placeholder="usuario@librostock.com" />
                {errores.email && <span className="field-error">{errores.email}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">
                  {usuarioAEditar ? 'Cambiar contraseña' : 'Contraseña inicial *'}
                </label>
                <input type="password" className={`form-input ${errores.password ? 'form-input--error' : ''}`}
                  value={form.password} onChange={e => setForm(p=>({...p, password: e.target.value}))}
                  placeholder={usuarioAEditar ? "Dejar vacío para no cambiar" : "Mínimo 6 caracteres"} />
                {errores.password && <span className="field-error">{errores.password}</span>}
              </div>
              <div className="form-group">
                <label className="form-label">Rol</label>
                <select className="form-input"
                  value={form.rol} onChange={e => setForm(p=>({...p, rol: e.target.value}))}>
                  <option value="operario">Operario</option>
                  <option value="admin">Admin</option>
                </select>
              </div>
              <div className="modal-form__footer">
                <button type="button" className="btn-outline" onClick={cerrarModalForm}>
                  Cancelar
                </button>
                <button id="btn-crear-usuario" type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? (
                    <><span className="btn-spinner-sm"/>{usuarioAEditar ? 'Guardando...' : 'Creando...'}</>
                  ) : (
                    usuarioAEditar ? 'Guardar cambios' : 'Crear usuario'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Cambiar Contraseña ─────────────────────────────── */}
      {modalPass && (
        <div className="modal-overlay">
          <div className="modal-form">
            <div className="modal-form__header">
              <h2>Cambiar contraseña</h2>
              <button className="modal-close" onClick={() => { setModalPass(null); setErrores({}); }}>✕</button>
            </div>
            <p className="modal-subtext">Usuario: <strong>{modalPass.nombre}</strong></p>
            <form onSubmit={handleCambiarPass} noValidate>
              <div className="form-group">
                <label className="form-label">Nueva contraseña *</label>
                <input type="password" className={`form-input ${errores.pass ? 'form-input--error' : ''}`}
                  value={formPass} onChange={e => { setFormPass(e.target.value); setErrores({}); }}
                  placeholder="Mínimo 6 caracteres" autoFocus />
                {errores.pass && <span className="field-error">{errores.pass}</span>}
              </div>
              <div className="modal-form__footer">
                <button type="button" className="btn-outline" onClick={() => setModalPass(null)}>Cancelar</button>
                <button id="btn-guardar-pass" type="submit" className="btn-primary" disabled={guardando}>
                  {guardando ? <><span className="btn-spinner-sm"/>Guardando...</> : 'Guardar'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}

      {/* ── Modal Toggle Estado ──────────────────────────────────── */}
      {toggleTarget && (
        <ConfirmModal
          titulo={toggleTarget.estado_activo ? '¿Desactivar usuario?' : '¿Activar usuario?'}
          mensaje={`${toggleTarget.estado_activo
            ? `"${toggleTarget.nombre}" no podrá iniciar sesión mientras esté desactivado.`
            : `"${toggleTarget.nombre}" podrá volver a iniciar sesión.`}`}
          onConfirmar={confirmarToggle}
          onCancelar={() => setToggleTarget(null)}
          cargando={guardando}
        />
      )}

      {/* ── Toast ────────────────────────────────────────────────── */}
      {toastMsg && <div className="toast" role="status">{toastMsg}</div>}
    </AppLayout>
  );
}

export default Usuarios;
