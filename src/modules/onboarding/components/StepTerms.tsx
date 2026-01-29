import { useState } from 'react';
import GavelIcon from '@mui/icons-material/Gavel';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import SecurityIcon from '@mui/icons-material/Security';
import StorageIcon from '@mui/icons-material/Storage';
import DescriptionIcon from '@mui/icons-material/Description';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Button, Card } from '../../../components/ui';

// Versao atual do termo
export const CURRENT_TERMS_VERSION = '1.0';

interface OnboardingData {
  companyName: string;
  slug: string;
  segments: string[];
  logoFile: File | null;
  logoPreview: string | null;
  termsAccepted: boolean;
  termsAcceptedItems: string[];
}

interface StepTermsProps {
  data: OnboardingData;
  onChange: (data: OnboardingData) => void;
  onNext: () => void;
  onBack?: () => void;
}

interface AcceptanceItem {
  id: string;
  label: string;
  required: boolean;
}

const ACCEPTANCE_ITEMS: AcceptanceItem[] = [
  {
    id: 'read_terms',
    label: 'Li e compreendi o Termo de Uso completo',
    required: true,
  },
  {
    id: 'agree_conditions',
    label: 'Concordo com todas as condicoes estabelecidas',
    required: true,
  },
  {
    id: 'accept_terms',
    label: 'Aceito os termos de uso e compromissos estabelecidos',
    required: true,
  },
  {
    id: 'authorize_storage',
    label: 'Autorizo o armazenamento dos meus dados conforme descrito',
    required: true,
  },
  {
    id: 'over_18',
    label: 'Declaro ter mais de 18 anos ou autorizacao do responsavel legal',
    required: true,
  },
];

export function StepTerms({ data, onChange, onNext, onBack }: StepTermsProps) {
  const [checkedItems, setCheckedItems] = useState<Set<string>>(
    new Set(data.termsAcceptedItems || [])
  );
  const [expandedSections, setExpandedSections] = useState<Set<string>>(new Set());

  const toggleItem = (itemId: string) => {
    const newChecked = new Set(checkedItems);
    if (newChecked.has(itemId)) {
      newChecked.delete(itemId);
    } else {
      newChecked.add(itemId);
    }
    setCheckedItems(newChecked);
    onChange({
      ...data,
      termsAccepted: ACCEPTANCE_ITEMS.filter((i) => i.required).every((i) =>
        newChecked.has(i.id)
      ),
      termsAcceptedItems: Array.from(newChecked),
    });
  };

  const toggleSection = (sectionId: string) => {
    const newExpanded = new Set(expandedSections);
    if (newExpanded.has(sectionId)) {
      newExpanded.delete(sectionId);
    } else {
      newExpanded.add(sectionId);
    }
    setExpandedSections(newExpanded);
  };

  const allRequiredChecked = ACCEPTANCE_ITEMS.filter((i) => i.required).every((i) =>
    checkedItems.has(i.id)
  );

  const termsSections = [
    {
      id: 'privacy',
      icon: SecurityIcon,
      title: 'Privacidade e Sigilo',
      color: 'text-green-500',
      bgColor: 'bg-green-500/10',
      content: [
        'Seus dados sao mantidos em sigilo absoluto',
        'Nao compartilhamos, vendemos ou cedemos seus dados a terceiros',
        'Nao utilizamos seus dados para marketing proprio ou de terceiros',
        'Seus dados sao de sua propriedade - apenas os armazenamos para fornecer o servico',
      ],
    },
    {
      id: 'storage',
      icon: StorageIcon,
      title: 'Armazenamento de Dados',
      color: 'text-blue-500',
      bgColor: 'bg-blue-500/10',
      content: [
        'Os dados sao armazenados na plataforma Supabase',
        'O Mercado Virtual nao se responsabiliza por falhas na infraestrutura do Supabase',
        'Recomendamos manter backups proprios atraves da funcao de exportacao',
      ],
    },
    {
      id: 'free_plan',
      icon: DescriptionIcon,
      title: 'Plano Gratuito',
      color: 'text-purple-500',
      bgColor: 'bg-purple-500/10',
      content: [
        'Limite de 20 produtos cadastrados',
        '1 usuario por empresa',
        'Sem acesso a cupons, promocoes e programa de fidelidade',
        'O plano gratuito pode ser alterado com aviso previo de 30 dias',
      ],
    },
    {
      id: 'commitment',
      icon: DescriptionIcon,
      title: 'Nosso Compromisso',
      color: 'text-amber-500',
      bgColor: 'bg-amber-500/10',
      content: [
        'Avisaremos com 60 dias de antecedencia sobre qualquer mudanca significativa',
        'Seus dados podem ser exportados a qualquer momento',
        'Assinaturas pagas terao reembolso proporcional se necessario',
        'Trabalhamos continuamente para manter o servico estavel e disponivel',
      ],
    },
  ];

  return (
    <Card className="p-6 md:p-8 w-full max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <GavelIcon className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Termo de Uso
        </h2>
        <p className="text-gray-500 dark:text-gray-400 text-sm">
          Leia com atencao antes de continuar
        </p>
      </div>

      {/* Resumo dos Termos */}
      <div className="space-y-2 mb-6 max-h-[280px] overflow-y-auto pr-1 scrollbar-thin scrollbar-thumb-gray-300 dark:scrollbar-thumb-gray-600">
        {termsSections.map((section) => (
          <div
            key={section.id}
            className="border border-gray-200 dark:border-gray-700 rounded-xl overflow-hidden transition-all duration-200"
          >
            <button
              type="button"
              onClick={() => toggleSection(section.id)}
              className="w-full flex items-center justify-between p-3 bg-gray-50 dark:bg-gray-800/50 hover:bg-gray-100 dark:hover:bg-gray-700/50 transition-colors"
            >
              <div className="flex items-center gap-3">
                <div className={`w-9 h-9 ${section.bgColor} rounded-lg flex items-center justify-center flex-shrink-0`}>
                  <section.icon className={`w-5 h-5 ${section.color}`} />
                </div>
                <span className="font-medium text-gray-900 dark:text-white text-sm text-left">
                  {section.title}
                </span>
              </div>
              <div className={`flex-shrink-0 ml-2 transition-transform duration-200 ${expandedSections.has(section.id) ? 'rotate-180' : ''}`}>
                <ExpandMoreIcon className="w-5 h-5 text-gray-400" />
              </div>
            </button>
            {expandedSections.has(section.id) && (
              <div className="p-3 bg-white dark:bg-gray-900/50 border-t border-gray-200 dark:border-gray-700">
                <ul className="space-y-2">
                  {section.content.map((item, index) => (
                    <li key={index} className="flex items-start gap-2 text-sm text-gray-600 dark:text-gray-400">
                      <CheckCircleIcon className={`w-4 h-4 ${section.color} flex-shrink-0 mt-0.5`} />
                      <span>{item}</span>
                    </li>
                  ))}
                </ul>
              </div>
            )}
          </div>
        ))}
      </div>

      {/* Link para termo completo */}
      <div className="mb-5 text-center">
        <a
          href="/termos"
          target="_blank"
          rel="noopener noreferrer"
          className="text-sm text-primary-600 dark:text-primary-400 hover:underline inline-flex items-center gap-1.5 transition-colors"
        >
          <DescriptionIcon className="w-4 h-4" />
          Ler Termo de Uso completo
        </a>
      </div>

      {/* Checkboxes de aceite */}
      <div className="space-y-2.5 mb-6 p-4 bg-gray-50 dark:bg-gray-800/50 rounded-xl border border-gray-100 dark:border-gray-700/50">
        <p className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-3">
          Para continuar, confirme que:
        </p>
        {ACCEPTANCE_ITEMS.map((item) => (
          <label
            key={item.id}
            className="flex items-start gap-3 cursor-pointer group py-1"
          >
            <div className="relative flex-shrink-0 mt-0.5">
              <input
                type="checkbox"
                checked={checkedItems.has(item.id)}
                onChange={() => toggleItem(item.id)}
                className="sr-only"
              />
              <div
                className={`w-5 h-5 rounded border-2 flex items-center justify-center transition-all duration-200 ${
                  checkedItems.has(item.id)
                    ? 'bg-primary-600 border-primary-600 scale-105'
                    : 'border-gray-300 dark:border-gray-600 group-hover:border-primary-400 group-hover:scale-105'
                }`}
              >
                {checkedItems.has(item.id) && (
                  <svg className="w-3 h-3 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                )}
              </div>
            </div>
            <span className={`text-sm leading-tight transition-colors duration-200 ${
              checkedItems.has(item.id)
                ? 'text-gray-900 dark:text-white'
                : 'text-gray-600 dark:text-gray-400'
            }`}>
              {item.label}
              {item.required && <span className="text-red-500 ml-1">*</span>}
            </span>
          </label>
        ))}
      </div>

      {/* Versao do termo */}
      <p className="text-xs text-gray-400 dark:text-gray-500 text-center mb-6">
        Versao do Termo: {CURRENT_TERMS_VERSION} | Ultima atualizacao: Janeiro 2026
      </p>

      {/* Botoes */}
      <div className="flex gap-3">
        {onBack && (
          <Button variant="outline" onClick={onBack} className="flex-1">
            <ArrowBackIcon className="w-5 h-5 mr-2" />
            Voltar
          </Button>
        )}
        <Button
          onClick={onNext}
          disabled={!allRequiredChecked}
          className="flex-1"
        >
          Aceitar e Continuar
          <ArrowForwardIcon className="w-5 h-5 ml-2" />
        </Button>
      </div>

      {!allRequiredChecked && (
        <p className="text-xs text-amber-600 dark:text-amber-400 text-center mt-3">
          Marque todas as opcoes obrigatorias para continuar
        </p>
      )}
    </Card>
  );
}
