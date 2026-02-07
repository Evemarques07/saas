import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import StarsIcon from '@mui/icons-material/Stars';
import CampaignIcon from '@mui/icons-material/Campaign';
import PaymentsIcon from '@mui/icons-material/Payments';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import CloseIcon from '@mui/icons-material/Close';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useNotifications } from '../../contexts/NotificationContext';
import { useTheme } from '../../contexts/ThemeContext';
import {
  buildAppPath,
  buildFullCatalogoUrl,
  PATHS,
} from '../../routes/paths';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
  isOpen?: boolean;
  isMobile?: boolean;
  onClose?: () => void;
}

interface NavItemConfig {
  route: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
  badgeKey?: 'pendingOrders';
}

// Configuracao de itens de navegacao (rotas relativas)
const navItemsConfig: NavItemConfig[] = [
  { route: PATHS.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon /> },
  { route: PATHS.VENDAS, label: 'Vendas', icon: <ShoppingCartIcon /> },
  { route: PATHS.PEDIDOS_CATALOGO, label: 'Pedidos', icon: <LocalShippingIcon />, badgeKey: 'pendingOrders' },
  { route: PATHS.CLIENTES, label: 'Clientes', icon: <PeopleIcon /> },
  { route: PATHS.PRODUTOS, label: 'Produtos', icon: <InventoryIcon /> },
  { route: PATHS.CATEGORIAS, label: 'Categorias', icon: <CategoryIcon /> },
  { route: PATHS.CUPONS, label: 'Cupons', icon: <LocalOfferIcon /> },
  { route: PATHS.FIDELIDADE, label: 'Fidelidade', icon: <StarsIcon /> },
  { route: PATHS.PROMOCOES, label: 'Promocoes', icon: <CampaignIcon /> },
  { route: PATHS.USUARIOS, label: 'Usuarios', icon: <GroupIcon />, adminOnly: true },
  { route: PATHS.FATURAMENTO, label: 'Faturamento', icon: <PaymentsIcon />, adminOnly: true },
  { route: PATHS.CONFIGURACOES, label: 'Configuracoes', icon: <SettingsIcon /> },
];

export function Sidebar({ collapsed, onToggle, isOpen = false, isMobile = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { isAdmin, currentCompany } = useTenant();
  const { pendingOrdersCount, hasNewOrders, markOrdersAsSeen } = useNotifications();
  const { theme } = useTheme();

  // Se nao tem empresa, nao renderiza
  if (!currentCompany) {
    return null;
  }

  // Em mobile, se nao esta aberto, nao renderiza
  if (isMobile && !isOpen) {
    return null;
  }

  const slug = currentCompany.slug;

  // Funcao para obter o valor do badge
  const getBadgeValue = (badgeKey?: 'pendingOrders'): number => {
    if (badgeKey === 'pendingOrders') return pendingOrdersCount;
    return 0;
  };

  // Construir itens de navegacao com paths dinamicos
  const navItems = navItemsConfig
    .filter((item) => {
      if (item.superAdminOnly && !isSuperAdmin) return false;
      if (item.adminOnly && !isAdmin) return false;
      return true;
    })
    .map((item) => ({
      ...item,
      path: buildAppPath(slug, item.route),
      badge: getBadgeValue(item.badgeKey),
    }));

  const catalogUrl = buildFullCatalogoUrl(slug);
  const dashboardPath = buildAppPath(slug, PATHS.DASHBOARD);

  const handleOpenCatalog = () => {
    window.open(catalogUrl, '_blank');
  };

  // Verificar se rota esta ativa
  const isActiveRoute = (itemPath: string, itemRoute: string): boolean => {
    // Dashboard e match exato
    if (itemRoute === PATHS.DASHBOARD) {
      return location.pathname === itemPath;
    }
    // Outras rotas - verificar se comeca com o path
    return location.pathname.startsWith(itemPath);
  };

  // Funcao para fechar sidebar ao navegar (mobile)
  const handleNavClick = (badgeKey?: 'pendingOrders') => {
    // Se clicou em Pedidos, marcar como visto
    if (badgeKey === 'pendingOrders') {
      markOrdersAsSeen();
    }
    if (isMobile && onClose) {
      onClose();
    }
  };

  return (
    <aside
      className={`
        fixed bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        transition-all duration-300 z-50 shadow-lg overflow-hidden
        ${isMobile
          ? 'left-0 top-0 bottom-0 w-72 rounded-r-2xl'
          : 'left-4 top-4 bottom-4 rounded-2xl ' + (collapsed ? 'w-16' : 'w-64')
        }
      `}
    >
      {/* Logo */}
      <div className={`h-16 flex items-center border-b border-gray-200 dark:border-gray-700 ${!isMobile && collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {(isMobile || !collapsed) && (
          <img
            src={theme === 'dark' ? '/mercadoVirtualBranco.png' : '/mercadoVirtualPreto.png'}
            alt="Mercado Virtual"
            className="h-14 w-auto object-contain"
          />
        )}
        <button
          onClick={isMobile ? onClose : onToggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {isMobile ? <CloseIcon /> : collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1 overflow-y-auto max-h-[calc(100vh-5rem)]">
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.path, item.route);
          const showLabel = isMobile || !collapsed;
          const showBadge = item.badge > 0;

          return (
            <NavLink
              key={item.path}
              to={item.path}
              onClick={() => handleNavClick(item.badgeKey)}
              className={`
                flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors relative
                ${isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }
              `}
              title={!showLabel ? `${item.label}${showBadge ? ` (${item.badge})` : ''}` : undefined}
            >
              <span className="w-5 h-5 flex-shrink-0 relative">
                {item.icon}
                {/* Badge no icone quando sidebar colapsada */}
                {showBadge && !showLabel && (
                  <span className="absolute -top-1.5 -right-1.5 min-w-[18px] h-[18px] flex items-center justify-center text-[10px] font-bold text-white bg-red-500 rounded-full px-1">
                    {item.badge > 99 ? '99+' : item.badge}
                  </span>
                )}
              </span>
              {showLabel && (
                <>
                  <span className="text-sm font-medium flex-1">{item.label}</span>
                  {/* Badge ao lado do label */}
                  {showBadge && (
                    <span className={`
                      min-w-[20px] h-5 flex items-center justify-center text-xs font-bold text-white rounded-full px-1.5
                      ${hasNewOrders && item.badgeKey === 'pendingOrders' ? 'bg-red-500 animate-pulse' : 'bg-red-500'}
                    `}>
                      {item.badge > 99 ? '99+' : item.badge}
                    </span>
                  )}
                </>
              )}
            </NavLink>
          );
        })}

        {/* Catalog Link - Opens in new tab */}
        <button
          onClick={() => {
            handleOpenCatalog();
            handleNavClick();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title={!isMobile && collapsed ? 'Catalogo Publico' : undefined}
        >
          <span className="w-5 h-5 flex-shrink-0"><StorefrontIcon /></span>
          {(isMobile || !collapsed) && (
            <>
              <span className="text-sm font-medium flex-1 text-left">Catalogo</span>
              <OpenInNewIcon className="w-4 h-4 text-gray-400" />
            </>
          )}
        </button>

        {/* Admin Panel Link - Super Admin only */}
        {isSuperAdmin && (
          <button
            onClick={() => {
              navigate('/admin');
              handleNavClick();
            }}
            className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
            title={!isMobile && collapsed ? 'Painel Admin' : undefined}
          >
            <span className="w-5 h-5 flex-shrink-0"><AdminPanelSettingsIcon /></span>
            {(isMobile || !collapsed) && (
              <span className="text-sm font-medium flex-1 text-left">Painel Admin</span>
            )}
          </button>
        )}
      </nav>
    </aside>
  );
}
