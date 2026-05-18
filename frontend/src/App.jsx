import { BrowserRouter, Routes, Route, Navigate } from 'react-router-dom';
import { AuthProvider } from './context/AuthContext';
import ProtectedRoute from './components/ProtectedRoute';

// Páginas
import Login        from './pages/Login';
import NoAutorizado from './pages/NoAutorizado';
import Dashboard    from './pages/Dashboard';
import Inventario   from './pages/Inventario';
import FormularioLibro from './pages/FormularioLibro';
import Ventas         from './pages/Ventas';
import Trazabilidad from './pages/Trazabilidad';
import Usuarios     from './pages/Usuarios';

function App() {
  return (
    <BrowserRouter>
      <AuthProvider>
        <Routes>
          <Route path="/" element={<Navigate to="/login" replace />} />
          <Route path="/login" element={<Login />} />

          {/* Admin */}
          <Route path="/dashboard" element={
            <ProtectedRoute rolesPermitidos={['admin']}><Dashboard /></ProtectedRoute>
          }/>
          <Route path="/inventario" element={
            <ProtectedRoute rolesPermitidos={['admin']}><Inventario /></ProtectedRoute>
          }/>
          <Route path="/inventario/nuevo" element={
            <ProtectedRoute rolesPermitidos={['admin']}><FormularioLibro /></ProtectedRoute>
          }/>
          <Route path="/inventario/editar/:id" element={
            <ProtectedRoute rolesPermitidos={['admin']}><FormularioLibro /></ProtectedRoute>
          }/>
          <Route path="/trazabilidad" element={
            <ProtectedRoute rolesPermitidos={['admin']}><Trazabilidad /></ProtectedRoute>
          }/>
          <Route path="/usuarios" element={
            <ProtectedRoute rolesPermitidos={['admin']}><Usuarios /></ProtectedRoute>
          }/>

          {/* Admin + Operario */}
          <Route path="/ventas" element={
            <ProtectedRoute rolesPermitidos={['admin', 'operario']}><Ventas /></ProtectedRoute>
          }/>

          <Route path="/no-autorizado" element={<NoAutorizado />} />
          <Route path="*" element={<Navigate to="/login" replace />} />
        </Routes>
      </AuthProvider>
    </BrowserRouter>
  );
}

export default App;
