import CategoryIcon from '@mui/icons-material/Category';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import { Button, Card } from '../../../components/ui';

interface OnboardingData {
  companyName: string;
  slug: string;
  segments: string[];
  logoFile: File | null;
  logoPreview: string | null;
}

interface StepSegmentsProps {
  data: OnboardingData;
  onChange: (data: OnboardingData) => void;
  onNext: () => void;
  onBack: () => void;
}

const AVAILABLE_SEGMENTS = [
  { id: 'roupas', label: 'Roupas', icon: '👗', description: 'Moda feminina, masculina e infantil' },
  { id: 'calcados', label: 'Calcados', icon: '👟', description: 'Sapatos, tenis e sandálias' },
  { id: 'perfumaria', label: 'Perfumaria', icon: '🌸', description: 'Perfumes e fragancias' },
  { id: 'cosmeticos', label: 'Cosmeticos', icon: '💄', description: 'Maquiagem e cuidados com a pele' },
  { id: 'acessorios', label: 'Acessorios', icon: '💍', description: 'Bolsas, cintos, relogios' },
  { id: 'joias', label: 'Joias e Bijuterias', icon: '💎', description: 'Joias finas e bijuterias' },
  { id: 'outros', label: 'Outros', icon: '📦', description: 'Outros tipos de produtos' },
];

export function StepSegments({ data, onChange, onNext, onBack }: StepSegmentsProps) {
  const toggleSegment = (segmentId: string) => {
    const newSegments = data.segments.includes(segmentId)
      ? data.segments.filter((s) => s !== segmentId)
      : [...data.segments, segmentId];
    onChange({ ...data, segments: newSegments });
  };

  const canProceed = data.segments.length > 0;

  return (
    <Card className="p-6 md:p-8 w-full max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-purple-100 dark:bg-purple-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <CategoryIcon className="w-8 h-8 text-purple-600" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          O que voce vende?
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Selecione os segmentos do seu negocio
        </p>
      </div>

      <div className="space-y-3 mb-6">
        {AVAILABLE_SEGMENTS.map((segment) => {
          const isSelected = data.segments.includes(segment.id);
          return (
            <button
              key={segment.id}
              type="button"
              onClick={() => toggleSegment(segment.id)}
              className={`w-full flex items-center gap-4 p-4 rounded-xl border-2 transition-all duration-200 text-left ${
                isSelected
                  ? 'border-primary-500 bg-primary-50 dark:bg-primary-900/20'
                  : 'border-gray-200 dark:border-gray-700 hover:border-gray-300 dark:hover:border-gray-600'
              }`}
            >
              <span className="text-2xl">{segment.icon}</span>
              <div className="flex-1">
                <p className={`font-medium ${isSelected ? 'text-primary-700 dark:text-primary-300' : 'text-gray-900 dark:text-white'}`}>
                  {segment.label}
                </p>
                <p className="text-sm text-gray-500 dark:text-gray-400">
                  {segment.description}
                </p>
              </div>
              {isSelected && (
                <CheckCircleIcon className="w-6 h-6 text-primary-500" />
              )}
            </button>
          );
        })}
      </div>

      {data.segments.length > 0 && (
        <p className="text-sm text-center text-gray-500 dark:text-gray-400 mb-4">
          {data.segments.length} segmento{data.segments.length > 1 ? 's' : ''} selecionado{data.segments.length > 1 ? 's' : ''}
        </p>
      )}

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onBack}
          className="flex-1"
        >
          <ArrowBackIcon className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="flex-1"
        >
          Continuar
          <ArrowForwardIcon className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </Card>
  );
}
