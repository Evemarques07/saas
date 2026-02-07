import { useState, useEffect } from 'react';
import { Link } from 'react-router-dom';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import RadioButtonUncheckedIcon from '@mui/icons-material/RadioButtonUnchecked';
import InventoryIcon from '@mui/icons-material/Inventory';
import PaletteIcon from '@mui/icons-material/Palette';
import ShoppingCartIcon from '@mui/icons-material/ShoppingCart';
import GroupAddIcon from '@mui/icons-material/GroupAdd';
import CloseIcon from '@mui/icons-material/Close';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Card, Button } from '../ui';
import { supabase } from '../../services/supabase';
import { useTenant } from '../../contexts/TenantContext';
import { buildAppPath } from '../../routes/paths';
import { usePlanFeatures } from '../../hooks/usePlanFeatures';

interface ChecklistItem {
  id: string;
  title: string;
  description: string;
  link: string;
  icon: React.ReactNode;
  completed: boolean;
}

export function ActivationChecklist() {
  const { currentCompany, isSubdomainMode } = useTenant();
  const { hasFeature } = usePlanFeatures();
  const [items, setItems] = useState<ChecklistItem[]>([]);
  const [loading, setLoading] = useState(true);
  const [dismissed, setDismissed] = useState(false);

  const slug = currentCompany?.slug || '';
  
  // Helper para construir links - usa path relativo em modo subdominio
  const buildLink = (route: string) => {
    if (isSubdomainMode) {
      return route;
    }
    return buildAppPath(slug, route);
  };
  const canInviteTeam = hasFeature('multiple_users');

  useEffect(() => {
    if (currentCompany) {
      checkProgress();
    }
  }, [currentCompany, canInviteTeam]);

  const checkProgress = async () => {
    if (!currentCompany) return;

    setLoading(true);

    try {
      // Verificar produtos
      const { count: productCount } = await supabase
        .from('products')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id);

      // Verificar se tem logo ou tema personalizado
      const hasCustomization = currentCompany.logo_url != null;

      // Verificar vendas/pedidos
      const { count: orderCount } = await supabase
        .from('catalog_orders')
        .select('*', { count: 'exact', head: true })
        .eq('company_id', currentCompany.id);

      // Base items (sempre visiveis)
      const baseItems: ChecklistItem[] = [
        {
          id: 'first_product',
          title: 'Cadastre seu primeiro produto',
          description: 'Adicione produtos ao seu catalogo para comecar a vender',
          link: buildLink('/produtos'),
          icon: <InventoryIcon className="w-5 h-5" />,
          completed: (productCount || 0) > 0,
        },
        {
          id: 'customize_catalog',
          title: 'Personalize sua loja',
          description: 'Adicione sua logo e configure as informacoes',
          link: buildLink('/configuracoes'),
          icon: <PaletteIcon className="w-5 h-5" />,
          completed: hasCustomization,
        },
        {
          id: 'first_sale',
          title: 'Receba seu primeiro pedido',
          description: 'Compartilhe o link do catalogo e faca sua primeira venda',
          link: buildLink('/pedidos'),
          icon: <ShoppingCartIcon className="w-5 h-5" />,
          completed: (orderCount || 0) > 0,
        },
      ];

      // Adicionar etapa de convite apenas se o plano permitir multiplos usuarios
      if (canInviteTeam) {
        const { count: memberCount } = await supabase
          .from('company_members')
          .select('*', { count: 'exact', head: true })
          .eq('company_id', currentCompany.id);

        baseItems.push({
          id: 'invite_team',
          title: 'Convide sua equipe',
          description: 'Adicione vendedores ou gerentes para ajudar',
          link: buildLink('/usuarios'),
          icon: <GroupAddIcon className="w-5 h-5" />,
          completed: (memberCount || 0) > 1,
        });
      }

      setItems(baseItems);
    } catch (err) {
      console.error('Error checking activation progress:', err);
    } finally {
      setLoading(false);
    }
  };

  // Verificar se checklist foi dispensado nesta sessao
  useEffect(() => {
    const dismissedKey = `checklist_dismissed_${currentCompany?.id}`;
    const wasDismissed = sessionStorage.getItem(dismissedKey) === 'true';
    setDismissed(wasDismissed);
  }, [currentCompany?.id]);

  const handleDismiss = () => {
    if (currentCompany) {
      sessionStorage.setItem(`checklist_dismissed_${currentCompany.id}`, 'true');
      setDismissed(true);
    }
  };

  // Nao mostrar se todas as tarefas estao completas ou foi dispensado
  const completedCount = items.filter((i) => i.completed).length;
  const allCompleted = items.length > 0 && completedCount === items.length;

  if (loading || dismissed || allCompleted) {
    return null;
  }

  const progress = items.length > 0 ? (completedCount / items.length) * 100 : 0;

  return (
    <Card className="p-4 md:p-6 mb-4 md:mb-6 border-2 border-primary-200 dark:border-primary-800 bg-gradient-to-r from-primary-50 to-purple-50 dark:from-primary-900/20 dark:to-purple-900/20">
      {/* Header */}
      <div className="flex items-start justify-between mb-4">
        <div className="flex items-center gap-3">
          <div className="p-2.5 rounded-xl bg-primary-600 text-white">
            <RocketLaunchIcon className="w-6 h-6" />
          </div>
          <div>
            <h3 className="font-semibold text-gray-900 dark:text-white">
              Configure sua loja
            </h3>
            <p className="text-sm text-gray-500 dark:text-gray-400">
              Complete essas tarefas para comecar a vender
            </p>
          </div>
        </div>
        <button
          onClick={handleDismiss}
          className="p-1.5 rounded-lg text-gray-400 hover:text-gray-600 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title="Dispensar"
        >
          <CloseIcon className="w-5 h-5" />
        </button>
      </div>

      {/* Progress Bar */}
      <div className="mb-4">
        <div className="flex items-center justify-between mb-1">
          <span className="text-sm text-gray-600 dark:text-gray-400">
            Progresso
          </span>
          <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
            {completedCount}/{items.length} completas
          </span>
        </div>
        <div className="h-2 bg-gray-200 dark:bg-gray-700 rounded-full overflow-hidden">
          <div
            className="h-full bg-gradient-to-r from-primary-500 to-purple-500 rounded-full transition-all duration-500"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>

      {/* Checklist Items */}
      <div className="space-y-2">
        {items.map((item) => (
          <Link
            key={item.id}
            to={item.link}
            className={`flex items-center gap-3 p-3 rounded-xl transition-all ${
              item.completed
                ? 'bg-green-50 dark:bg-green-900/20 border border-green-200 dark:border-green-800'
                : 'bg-white dark:bg-gray-800 border border-gray-200 dark:border-gray-700 hover:border-primary-300 dark:hover:border-primary-700 hover:shadow-sm'
            }`}
          >
            {/* Status Icon */}
            <div className={`flex-shrink-0 ${item.completed ? 'text-green-500' : 'text-gray-400'}`}>
              {item.completed ? (
                <CheckCircleIcon className="w-6 h-6" />
              ) : (
                <RadioButtonUncheckedIcon className="w-6 h-6" />
              )}
            </div>

            {/* Icon */}
            <div className={`p-2 rounded-lg flex-shrink-0 ${
              item.completed
                ? 'bg-green-100 dark:bg-green-900/30 text-green-600'
                : 'bg-gray-100 dark:bg-gray-700 text-gray-600 dark:text-gray-400'
            }`}>
              {item.icon}
            </div>

            {/* Content */}
            <div className="flex-1 min-w-0">
              <p className={`font-medium text-sm ${
                item.completed
                  ? 'text-green-700 dark:text-green-300 line-through'
                  : 'text-gray-900 dark:text-white'
              }`}>
                {item.title}
              </p>
              <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                {item.description}
              </p>
            </div>

            {/* Arrow */}
            {!item.completed && (
              <ArrowForwardIcon className="w-5 h-5 text-gray-400 flex-shrink-0" />
            )}
          </Link>
        ))}
      </div>

      {/* Help text */}
      <p className="text-xs text-center text-gray-400 mt-4">
        Voce pode acessar essas opcoes a qualquer momento pelo menu lateral
      </p>
    </Card>
  );
}
