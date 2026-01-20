import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';
import { NotificationProvider } from '../../contexts/NotificationContext';

const SIDEBAR_COLLAPSED_KEY = 'ejym_sidebar_collapsed';

export function AppLayout() {
  // Inicializar estado da sidebar a partir do localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

  // Detectar tamanho da tela
  useEffect(() => {
    const checkMobile = () => {
      setIsMobile(window.innerWidth < 768);
      if (window.innerWidth < 768) {
        setSidebarOpen(false);
      }
    };

    checkMobile();
    window.addEventListener('resize', checkMobile);
    return () => window.removeEventListener('resize', checkMobile);
  }, []);

  // Salvar estado da sidebar no localStorage
  useEffect(() => {
    localStorage.setItem(SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
  }, [sidebarCollapsed]);

  const handleToggleSidebar = () => {
    if (isMobile) {
      setSidebarOpen(!sidebarOpen);
    } else {
      setSidebarCollapsed(!sidebarCollapsed);
    }
  };

  const handleCloseSidebar = () => {
    if (isMobile) {
      setSidebarOpen(false);
    }
  };

  return (
    <NotificationProvider>
      <div className="h-screen overflow-hidden bg-gray-50 dark:bg-gray-900">
        {/* Mobile overlay */}
        {isMobile && sidebarOpen && (
          <div
            className="fixed inset-0 bg-black/50 z-40 md:hidden"
            onClick={handleCloseSidebar}
          />
        )}

        <Sidebar
          collapsed={sidebarCollapsed}
          onToggle={handleToggleSidebar}
          isOpen={sidebarOpen}
          isMobile={isMobile}
          onClose={handleCloseSidebar}
        />

        <div
          className={`
            transition-all duration-300 h-screen flex flex-col
            ${isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-24' : 'ml-72'}
          `}
        >
          <Header onMenuClick={handleToggleSidebar} isMobile={isMobile} />
          <main className="px-2 md:px-4 pb-2 md:pb-4 flex-1 overflow-hidden">
            <div className="h-full bg-white dark:bg-gray-800 rounded-2xl border border-gray-200 dark:border-gray-700 overflow-hidden">
              <div className="h-full overflow-auto p-3 md:p-4">
                <Outlet />
              </div>
            </div>
          </main>
        </div>
      </div>
    </NotificationProvider>
  );
}
