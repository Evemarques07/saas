import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import CategoryIcon from '@mui/icons-material/Category';
import StorefrontIcon from '@mui/icons-material/Storefront';
import GroupIcon from '@mui/icons-material/Group';
import SettingsIcon from '@mui/icons-material/Settings';
import MenuIcon from '@mui/icons-material/Menu';
import ChevronLeftIcon from '@mui/icons-material/ChevronLeft';
import OpenInNewIcon from '@mui/icons-material/OpenInNew';
import AdminPanelSettingsIcon from '@mui/icons-material/AdminPanelSettings';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import {
  buildAppPath,
  buildCatalogoPath,
  PATHS,
} from '../../routes/paths';

interface SidebarProps {
  collapsed: boolean;
  onToggle: () => void;
}

interface NavItemConfig {
  route: string;
  label: string;
  icon: React.ReactNode;
  adminOnly?: boolean;
  superAdminOnly?: boolean;
}

// Configuracao de itens de navegacao (rotas relativas)
const navItemsConfig: NavItemConfig[] = [
  { route: PATHS.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon /> },
  { route: PATHS.VENDAS, label: 'Vendas', icon: <ShoppingCartIcon /> },
  { route: PATHS.PEDIDOS_CATALOGO, label: 'Pedidos', icon: <LocalShippingIcon /> },
  { route: PATHS.CLIENTES, label: 'Clientes', icon: <PeopleIcon /> },
  { route: PATHS.PRODUTOS, label: 'Produtos', icon: <InventoryIcon /> },
  { route: PATHS.CATEGORIAS, label: 'Categorias', icon: <CategoryIcon /> },
  { route: PATHS.USUARIOS, label: 'Usuarios', icon: <GroupIcon />, adminOnly: true },
  { route: PATHS.CONFIGURACOES, label: 'Configuracoes', icon: <SettingsIcon /> },
];

export function Sidebar({ collapsed, onToggle }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { isAdmin, currentCompany } = useTenant();

  // Se nao tem empresa, nao renderiza
  if (!currentCompany) {
    return null;
  }

  const slug = currentCompany.slug;

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
    }));

  const catalogUrl = `${window.location.origin}${buildCatalogoPath(slug)}`;
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

  return (
    <aside
      className={`
        fixed left-4 top-4 bottom-4 bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700
        transition-all duration-300 z-30 rounded-2xl shadow-lg overflow-hidden
        ${collapsed ? 'w-16' : 'w-64'}
      `}
    >
      {/* Logo */}
      <div className="h-16 flex items-center justify-between px-4 border-b border-gray-200 dark:border-gray-700">
        {!collapsed && (
          <span className="logo-text text-2xl font-bold text-primary-600">EJYM</span>
        )}
        <button
          onClick={onToggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
        >
          {collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Navigation */}
      <nav className="p-2 space-y-1">
        {navItems.map((item) => {
          const isActive = isActiveRoute(item.path, item.route);

          return (
            <NavLink
              key={item.path}
              to={item.path}
              className={`
                flex items-center gap-3 px-3 py-2 rounded-lg transition-colors
                ${isActive
                  ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                  : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700'
                }
              `}
              title={collapsed ? item.label : undefined}
            >
              <span className="w-5 h-5">{item.icon}</span>
              {!collapsed && (
                <span className="text-sm font-medium">{item.label}</span>
              )}
            </NavLink>
          );
        })}

        {/* Catalog Link - Opens in new tab */}
        <button
          onClick={handleOpenCatalog}
          className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-700"
          title={collapsed ? 'Catalogo Publico' : undefined}
        >
          <span className="w-5 h-5"><StorefrontIcon /></span>
          {!collapsed && (
            <>
              <span className="text-sm font-medium flex-1 text-left">Catalogo</span>
              <OpenInNewIcon className="w-4 h-4 text-gray-400" />
            </>
          )}
        </button>

        {/* Admin Panel Link - Super Admin only */}
        {isSuperAdmin && (
          <button
            onClick={() => navigate('/admin')}
            className="w-full flex items-center gap-3 px-3 py-2 rounded-lg transition-colors text-purple-600 hover:bg-purple-50 dark:text-purple-400 dark:hover:bg-purple-900/20"
            title={collapsed ? 'Painel Admin' : undefined}
          >
            <span className="w-5 h-5"><AdminPanelSettingsIcon /></span>
            {!collapsed && (
              <span className="text-sm font-medium flex-1 text-left">Painel Admin</span>
            )}
          </button>
        )}
      </nav>
    </aside>
  );
}
