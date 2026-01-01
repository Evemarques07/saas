import { useState, useEffect } from 'react';
import { Outlet } from 'react-router-dom';
import { Sidebar } from './Sidebar';
import { Header } from './Header';

export function AppLayout() {
  const [sidebarCollapsed, setSidebarCollapsed] = useState(false);
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
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
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
          transition-all duration-300
          ${isMobile ? 'ml-0' : sidebarCollapsed ? 'ml-24' : 'ml-72'}
        `}
      >
        <Header onMenuClick={handleToggleSidebar} isMobile={isMobile} />
        <main className="p-2 md:p-4">
          <Outlet />
        </main>
      </div>
    </div>
  );
}
