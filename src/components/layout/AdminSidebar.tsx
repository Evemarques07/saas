import { NavLink, useLocation } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import BusinessIcon from '@mui/icons-material/Business';
import PeopleIcon from '@mui/icons-material/People';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';

interface AdminSidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isOpen?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

interface NavItem {
  path: string;
  label: string;
  icon: React.ReactNode;
}

const navItems: NavItem[] = [
  { path: '/admin', label: 'Dashboard', icon: <DashboardIcon /> },
  { path: '/admin/empresas', label: 'Empresas', icon: <BusinessIcon /> },
  { path: '/admin/usuarios', label: 'Usuarios', icon: <PeopleIcon /> },
  { path: '/admin/whatsapp', label: 'WhatsApp', icon: <WhatsAppIcon /> },
];

export function AdminSidebar({ collapsed, onToggle, isOpen = false, isMobile = false, onClose }: AdminSidebarProps) {
  const location = useLocation();

  const isActiveRoute = (itemPath: string): boolean => {
    if (itemPath === '/admin') {
      return location.pathname === '/admin';
    }
    return location.pathname.startsWith(itemPath);
  };

  // Em mobile, se nao esta aberto, nao renderiza
  if (isMobile && !isOpen) {
    return null;
  }

  const handleNavClick = () => {
    if (isMobile && onClose) {
      onClose();
    }
  };

  const showLabel = isMobile || !collapsed;

  return (
    <aside
      className={`
        fixed bg-gray-900 border border-gray-700
        transition-all duration-300 z-50 shadow-lg overflow-hidden
        ${isMobile
          ? 'left-0 top-0 bottom-0 w-72 rounded-r-2xl'
          : 'left-4 top-4 bottom-4 rounded-2xl ' + (collapsed ? 'w-16' : 'w-64')
        }
      `}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-gray-700 ${!isMobile && collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {showLabel && (
          <div className="flex items-center gap-2">
            <AdminPanelSettingsIcon className="text-primary-400" />
            <img
              src="/mercadoVirtualBranco.png"
              alt="Mercado Virtual"
              className="h-14 w-auto object-contain"
            />
          </div>
        )}
        <button
          onClick={isMobile ? onClose : onToggle}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-800 transition-colors"
        >
          {isMobile ? <CloseIcon /> : collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.path);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={handleNavClick}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors
                ${isActive
                  ? 'bg-primary-600 text-white'
                  : 'text-gray-300 hover:bg-gray-800 hover:text-white'
                }
              `}
              title={!showLabel ? item.label : undefined}
            >
              <span className="w-5 h-5 flex-shrink-0">{item.icon}</span>
              {showLabel && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}
      </nav>

      {/* Footer - Indicador de modo admin */}
      <div className="absolute bottom-0 left-0 right-0 p-4 border-t border-gray-700">
        {showLabel && (
          <div className="text-xs text-gray-500 text-center">
            Modo Administrador
          </div>
        )}
      </div>
    </aside>
  );
}
