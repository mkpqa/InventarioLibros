import { useState } from 'react';
import Navbar from './Navbar';
import Sidebar from './Sidebar';
import './AppLayout.css';

/**
 * AppLayout — Layout contenedor para todas las páginas autenticadas.
 * Incluye Navbar fija, Sidebar fijo y área de contenido scrollable.
 */
function AppLayout({ children }) {
  const [sidebarOpen, setSidebarOpen] = useState(false);

  return (
    <div className="app-layout">
      <Navbar onMenuToggle={() => setSidebarOpen(prev => !prev)} />
      <Sidebar isOpen={sidebarOpen} onClose={() => setSidebarOpen(false)} />
      <main className="app-layout__content">
        {children}
      </main>
    </div>
  );
}

export default AppLayout;
