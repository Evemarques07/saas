import { useNavigate } from 'react-router-dom';
import LockIcon from '@mui/icons-material/Lock';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import LocalOfferIcon from '@mui/icons-material/LocalOffer';
import CampaignIcon from '@mui/icons-material/Campaign';
import LoyaltyIcon from '@mui/icons-material/Loyalty';
import WhatsAppIcon from '@mui/icons-material/WhatsApp';
import AssessmentIcon from '@mui/icons-material/Assessment';
import GroupIcon from '@mui/icons-material/Group';
import { Card, Button } from '../ui';
import { useTenant } from '../../contexts/TenantContext';
import type { PlanFeatures } from '../../types';

interface FeatureInfo {
  icon: React.ElementType;
  title: string;
  description: string;
  minPlan: string;
}

const FEATURE_INFO: Record<keyof PlanFeatures, FeatureInfo> = {
  coupons: {
    icon: LocalOfferIcon,
    title: 'Cupons de Desconto',
    description: 'Crie cupons promocionais para atrair e fidelizar clientes com descontos especiais.',
    minPlan: 'Starter',
  },
  promotions: {
    icon: CampaignIcon,
    title: 'Sistema de Promocoes',
    description: 'Configure promocoes automaticas como descontos de aniversario, primeira compra e mais.',
    minPlan: 'Starter',
  },
  loyalty_program: {
    icon: LoyaltyIcon,
    title: 'Programa de Fidelidade',
    description: 'Recompense seus clientes com pontos a cada compra e aumente a retencao.',
    minPlan: 'Profissional',
  },
  whatsapp_notifications: {
    icon: WhatsAppIcon,
    title: 'Notificacoes WhatsApp',
    description: 'Envie notificacoes automaticas de pedidos e promocoes direto no WhatsApp dos clientes.',
    minPlan: 'Starter',
  },
  advanced_reports: {
    icon: AssessmentIcon,
    title: 'Relatorios Avancados',
    description: 'Acesse relatorios detalhados de vendas, produtos e comportamento dos clientes.',
    minPlan: 'Profissional',
  },
  multiple_users: {
    icon: GroupIcon,
    title: 'Multiplos Usuarios',
    description: 'Adicione membros da equipe para gerenciar sua loja de forma colaborativa.',
    minPlan: 'Starter',
  },
};

interface UpgradePromptProps {
  feature: keyof PlanFeatures;
  compact?: boolean;
}

export function UpgradePrompt({ feature, compact = false }: UpgradePromptProps) {
  const navigate = useNavigate();
  const { currentCompany } = useTenant();

  const info = FEATURE_INFO[feature];
  const Icon = info.icon;

  const handleUpgrade = () => {
    if (currentCompany?.slug) {
      navigate(`/app/${currentCompany.slug}/faturamento`);
    }
  };

  if (compact) {
    return (
      <div className="bg-gradient-to-r from-primary-50 to-primary-100 dark:from-primary-900/20 dark:to-primary-800/20 border border-primary-200 dark:border-primary-700 rounded-lg p-4 flex items-center gap-4">
        <div className="w-10 h-10 bg-primary-100 dark:bg-primary-800 rounded-full flex items-center justify-center flex-shrink-0">
          <LockIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
        </div>
        <div className="flex-1 min-w-0">
          <p className="text-sm font-medium text-primary-900 dark:text-primary-100">
            {info.title} - Disponivel no plano {info.minPlan}+
          </p>
        </div>
        <Button size="sm" onClick={handleUpgrade}>
          Upgrade
        </Button>
      </div>
    );
  }

  return (
    <div className="flex items-center justify-center min-h-[400px] p-4">
      <Card className="max-w-md w-full">
        <div className="p-8 text-center">
          {/* Icon */}
          <div className="relative inline-flex mb-6">
            <div className="w-20 h-20 bg-gradient-to-br from-primary-100 to-primary-200 dark:from-primary-800 dark:to-primary-700 rounded-full flex items-center justify-center">
              <Icon className="w-10 h-10 text-primary-600 dark:text-primary-400" />
            </div>
            <div className="absolute -bottom-1 -right-1 w-8 h-8 bg-yellow-100 dark:bg-yellow-800 rounded-full flex items-center justify-center border-2 border-white dark:border-gray-800">
              <LockIcon className="w-4 h-4 text-yellow-600 dark:text-yellow-400" />
            </div>
          </div>

          {/* Title */}
          <h2 className="text-xl font-bold text-gray-900 dark:text-white mb-2">
            {info.title}
          </h2>

          {/* Description */}
          <p className="text-gray-600 dark:text-gray-400 mb-6">
            {info.description}
          </p>

          {/* Plan Badge */}
          <div className="inline-flex items-center gap-2 bg-primary-50 dark:bg-primary-900/30 text-primary-700 dark:text-primary-300 px-4 py-2 rounded-full text-sm font-medium mb-6">
            <RocketLaunchIcon className="w-4 h-4" />
            Disponivel a partir do plano {info.minPlan}
          </div>

          {/* CTA Button */}
          <div className="space-y-3">
            <Button fullWidth onClick={handleUpgrade}>
              <RocketLaunchIcon className="w-4 h-4" />
              Fazer Upgrade
            </Button>
            <p className="text-xs text-gray-500 dark:text-gray-400">
              Desbloqueie recursos avancados para crescer seu negocio
            </p>
          </div>
        </div>
      </Card>
    </div>
  );
}
