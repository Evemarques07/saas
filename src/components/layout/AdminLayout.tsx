import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { AdminSidebar } from './AdminSidebar';
import { AdminHeader } from './AdminHeader';

const ADMIN_SIDEBAR_COLLAPSED_KEY = 'ejym_admin_sidebar_collapsed';

export function AdminLayout() {
  // Inicializar estado da sidebar a partir do localStorage
  const [sidebarCollapsed, setSidebarCollapsed] = useState(() => {
    const saved = localStorage.getItem(ADMIN_SIDEBAR_COLLAPSED_KEY);
    return saved === 'true';
  });
  const [sidebarOpen, setSidebarOpen] = useState(false);
  const [isMobile, setIsMobile] = useState(false);

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
    localStorage.setItem(ADMIN_SIDEBAR_COLLAPSED_KEY, String(sidebarCollapsed));
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
    <div className="h-screen overflow-hidden bg-gray-900">
      {/* Mobile overlay */}
      {isMobile && sidebarOpen && (
        <div
          className="fixed inset-0 bg-black/50 z-40 md:hidden"
          onClick={handleCloseSidebar}
        />
      )}

      <AdminSidebar
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
        <AdminHeader onMenuClick={handleToggleSidebar} isMobile={isMobile} />

        <main className="px-2 md:px-4 pb-2 md:pb-4 flex-1 overflow-hidden">
          <div className="h-full bg-gray-800 rounded-2xl border border-gray-700 overflow-hidden">
            <div className="h-full overflow-y-auto overflow-x-hidden p-3 md:p-4">
              <Outlet />
            </div>
          </div>
        </main>
      </div>
    </div>
  );
}
