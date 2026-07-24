import { useState, useEffect } from 'react';
import { NavLink, useLocation, useNavigate } from 'react-router-dom';
import DashboardIcon from '@mui/icons-material/Dashboard';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import LocalShippingIcon from '@mui/icons-material/LocalShipping';
import PeopleIcon from '@mui/icons-material/People';
import InventoryIcon from '@mui/icons-material/Inventory';
import InputIcon from '@mui/icons-material/Input';
import TimelineIcon from '@mui/icons-material/Timeline';
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

interface NavSectionConfig {
  title?: string;
  items: NavItemConfig[];
}

// Item ja resolvido (com path e badge) usado na renderizacao
type NavItem = NavItemConfig & { path: string; badge: number };

// Itens de navegacao agrupados por secao (rotas relativas)
const navSectionsConfig: NavSectionConfig[] = [
  {
    items: [
      { route: PATHS.DASHBOARD, label: 'Dashboard', icon: <DashboardIcon /> },
    ],
  },
  {
    title: 'Vendas',
    items: [
      { route: PATHS.VENDAS, label: 'Vendas', icon: <ShoppingCartIcon /> },
      { route: PATHS.PEDIDOS_CATALOGO, label: 'Pedidos', icon: <LocalShippingIcon />, badgeKey: 'pendingOrders' },
      { route: PATHS.CLIENTES, label: 'Clientes', icon: <PeopleIcon /> },
    ],
  },
  {
    title: 'Estoque',
    items: [
      { route: PATHS.PRODUTOS, label: 'Produtos', icon: <InventoryIcon /> },
      { route: PATHS.ENTRADA_ESTOQUE, label: 'Entrada Estoque', icon: <InputIcon /> },
      { route: PATHS.MOVIMENTACOES, label: 'Movimentações', icon: <TimelineIcon /> },
      { route: PATHS.CATEGORIAS, label: 'Categorias', icon: <CategoryIcon /> },
    ],
  },
  {
    title: 'Marketing',
    items: [
      { route: PATHS.CUPONS, label: 'Cupons', icon: <LocalOfferIcon /> },
      { route: PATHS.FIDELIDADE, label: 'Fidelidade', icon: <StarsIcon /> },
      { route: PATHS.PROMOCOES, label: 'Promocoes', icon: <CampaignIcon /> },
    ],
  },
  {
    title: 'Administração',
    items: [
      { route: PATHS.USUARIOS, label: 'Usuarios', icon: <GroupIcon />, adminOnly: true },
      { route: PATHS.FATURAMENTO, label: 'Faturamento', icon: <PaymentsIcon />, adminOnly: true },
      { route: PATHS.CONFIGURACOES, label: 'Configuracoes', icon: <SettingsIcon /> },
    ],
  },
];

const SECTIONS_STORAGE_KEY = 'ejym_sidebar_sections';

export function Sidebar({ collapsed, onToggle, isOpen = false, isMobile = false, onClose }: SidebarProps) {
  const location = useLocation();
  const navigate = useNavigate();
  const { isSuperAdmin } = useAuth();
  const { isAdmin, currentCompany } = useTenant();
  const { pendingOrdersCount, hasNewOrders, markOrdersAsSeen } = useNotifications();
  const { theme } = useTheme();

  // Secoes colapsadas por grupo (persistido no localStorage)
  const [collapsedSections, setCollapsedSections] = useState<Set<string>>(() => {
    try {
      const saved = localStorage.getItem(SECTIONS_STORAGE_KEY);
      return saved ? new Set<string>(JSON.parse(saved)) : new Set();
    } catch {
      return new Set();
    }
  });

  useEffect(() => {
    localStorage.setItem(SECTIONS_STORAGE_KEY, JSON.stringify([...collapsedSections]));
  }, [collapsedSections]);

  const toggleSection = (title: string) => {
    setCollapsedSections((prev) => {
      const next = new Set(prev);
      if (next.has(title)) next.delete(title);
      else next.add(title);
      return next;
    });
  };

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

  // Construir secoes com itens filtrados por permissao e paths dinamicos
  const navSections = navSectionsConfig
    .map((section) => ({
      title: section.title,
      items: section.items
        .filter((item) => {
          if (item.superAdminOnly && !isSuperAdmin) return false;
          if (item.adminOnly && !isAdmin) return false;
          return true;
        })
        .map((item): NavItem => ({
          ...item,
          path: buildAppPath(slug, item.route),
          badge: getBadgeValue(item.badgeKey),
        })),
    }))
    .filter((section) => section.items.length > 0);

  const catalogUrl = buildFullCatalogoUrl(slug);

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

  // Renderiza um item de navegacao (link)
  const renderNavItem = (item: NavItem) => {
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
            : 'text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800'
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
  };

  return (
    <aside
      className={`
        fixed flex flex-col bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-700
        transition-all duration-300 z-50 shadow-lg dark:shadow-glow overflow-hidden
        ${isMobile
          ? 'left-0 top-0 bottom-0 w-72 rounded-r-2xl'
          : 'left-2 top-2 bottom-2 rounded-2xl ' + (collapsed ? 'w-16' : 'w-64')
        }
      `}
    >
      {/* Logo */}
      <div className={`h-16 flex-shrink-0 flex items-center border-b border-gray-200 dark:border-gray-700 ${!isMobile && collapsed ? 'justify-center px-2' : 'justify-between px-4'}`}>
        {(isMobile || !collapsed) && (
          <img
            src={theme === 'dark' ? '/mercadoVirtualBranco.png' : '/mercadoVirtualPreto.png'}
            alt="Mercado Virtual"
            className="h-14 w-auto object-contain"
          />
        )}
        <button
          onClick={isMobile ? onClose : onToggle}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
        >
          {isMobile ? <CloseIcon /> : collapsed ? <MenuIcon /> : <ChevronLeftIcon />}
        </button>
      </div>

      {/* Navigation - ocupa o espaco restante e rola internamente (ultimo item nunca corta) */}
      <nav className="flex-1 min-h-0 overflow-y-auto p-2 pb-3">
        {navSections.map((section, idx) => {
          const showLabel = isMobile || !collapsed;
          // So colapsa por grupo no modo expandido (com titulo visivel)
          const isSectionCollapsed = !!section.title && showLabel && collapsedSections.has(section.title);
          return (
            <div key={section.title ?? `section-${idx}`}>
              {/* Titulo clicavel (expandido) ou divisoria sutil (sidebar colapsada) */}
              {section.title && (
                showLabel ? (
                  <button
                    type="button"
                    onClick={() => toggleSection(section.title!)}
                    aria-expanded={!isSectionCollapsed}
                    className="w-full flex items-center justify-between px-3 pt-3 pb-1 text-[11px] font-semibold uppercase tracking-wider text-gray-400 dark:text-gray-500 hover:text-gray-600 dark:hover:text-gray-300 transition-colors select-none"
                  >
                    <span>{section.title}</span>
                    <ExpandMoreIcon
                      style={{ fontSize: 16 }}
                      className={`transition-transform duration-200 ${isSectionCollapsed ? '-rotate-90' : ''}`}
                    />
                  </button>
                ) : (
                  <div className="mx-2 my-2 border-t border-gray-100 dark:border-gray-700" aria-hidden="true" />
                )
              )}
              {/* Itens: no modo expandido com titulo, anima a altura (grid 0fr<->1fr);
                  senao (sidebar em icone / secao sem titulo) renderiza normal para
                  nao cortar os badges absolutos com overflow-hidden */}
              {section.title && showLabel ? (
                <div
                  className={`grid transition-[grid-template-rows] duration-200 ease-out ${
                    isSectionCollapsed ? 'grid-rows-[0fr]' : 'grid-rows-[1fr]'
                  }`}
                >
                  <div className="overflow-hidden">
                    <div className="space-y-1">
                      {section.items.map(renderNavItem)}
                    </div>
                  </div>
                </div>
              ) : (
                <div className="space-y-1">
                  {section.items.map(renderNavItem)}
                </div>
              )}
            </div>
          );
        })}

        {/* Acoes extras: catalogo publico + painel admin (super admin) */}
        <div className="mt-2 pt-2 border-t border-gray-100 dark:border-gray-700 space-y-1">
        {/* Catalog Link - Opens in new tab */}
        <button
          onClick={() => {
            handleOpenCatalog();
            handleNavClick();
          }}
          className="w-full flex items-center gap-3 px-3 py-2.5 rounded-lg transition-colors text-gray-600 hover:bg-gray-100 dark:text-gray-300 dark:hover:bg-gray-800"
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
        </div>
      </nav>
    </aside>
  );
}
