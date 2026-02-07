import { useState, useEffect } from 'react';
import StoreIcon from '@mui/icons-material/Store';
import LinkIcon from '@mui/icons-material/Link';
import ArrowForwardIcon from '@mui/icons-material/ArrowForward';
import { Button, Input, Card } from '../../../components/ui';
import { supabase } from '../../../services/supabase';

interface OnboardingData {
  companyName: string;
  slug: string;
  segments: string[];
  logoFile: File | null;
  logoPreview: string | null;
  termsAccepted: boolean;
  termsAcceptedItems: string[];
}

interface StepCompanyNameProps {
  data: OnboardingData;
  onChange: (data: OnboardingData) => void;
  onNext: () => void;
}

// Slugs reservados que nao podem ser usados
const RESERVED_SLUGS = [
  'admin', 'api', 'app', 'catalogo', 'login', 'registro', 'onboarding',
  'aceitar-convite', 'inicio', 'dashboard', 'www', 'mail', 'ftp', 'smtp',
  'support', 'help', 'blog', 'static', 'assets', 'cdn', 'media'
];

export function StepCompanyName({ data, onChange, onNext }: StepCompanyNameProps) {
  const [slugError, setSlugError] = useState<string | null>(null);
  const [checkingSlug, setCheckingSlug] = useState(false);
  const [slugAvailable, setSlugAvailable] = useState<boolean | null>(null);

  // Gerar slug a partir do nome
  const generateSlug = (name: string): string => {
    return name
      .toLowerCase()
      .normalize('NFD')
      .replace(/[\u0300-\u036f]/g, '') // Remove acentos
      .replace(/[^a-z0-9]/g, ''); // Remove tudo exceto letras e numeros
  };

  // Verificar disponibilidade do slug
  const checkSlugAvailability = async (slug: string) => {
    if (!slug || slug.length < 3) {
      setSlugAvailable(null);
      setSlugError(null);
      return;
    }

    // Verificar slugs reservados
    if (RESERVED_SLUGS.includes(slug)) {
      setSlugAvailable(false);
      setSlugError('Este nome esta reservado. Escolha outro.');
      return;
    }

    setCheckingSlug(true);
    setSlugError(null);

    try {
      const { data: existing, error } = await supabase
        .from('companies')
        .select('slug')
        .eq('slug', slug)
        .maybeSingle();

      if (error) throw error;

      if (existing) {
        setSlugAvailable(false);
        setSlugError('Este endereco ja esta em uso. Escolha outro.');
      } else {
        setSlugAvailable(true);
        setSlugError(null);
      }
    } catch (err) {
      console.error('Error checking slug:', err);
      setSlugError('Erro ao verificar disponibilidade');
    } finally {
      setCheckingSlug(false);
    }
  };

  // Debounce para verificar slug
  useEffect(() => {
    const timer = setTimeout(() => {
      if (data.slug) {
        checkSlugAvailability(data.slug);
      }
    }, 500);

    return () => clearTimeout(timer);
  }, [data.slug]);

  const handleNameChange = (name: string) => {
    const newSlug = generateSlug(name);
    onChange({ ...data, companyName: name, slug: newSlug });
  };

  const handleSlugChange = (slug: string) => {
    const sanitizedSlug = slug
      .toLowerCase()
      .replace(/[^a-z0-9-]/g, '')
      .replace(/-+/g, '-');
    onChange({ ...data, slug: sanitizedSlug });
  };

  const canProceed = data.companyName.length >= 2 && data.slug.length >= 3 && slugAvailable === true;

  return (
    <Card className="p-6 md:p-8 w-full max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-primary-100 dark:bg-primary-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <StoreIcon className="w-8 h-8 text-primary-600" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Vamos criar sua loja!
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Escolha um nome que represente seu negocio
        </p>
      </div>

      <div className="space-y-6">
        <Input
          label="Nome da sua loja"
          placeholder="Ex: Minha Loja de Cosmeticos"
          value={data.companyName}
          onChange={(e) => handleNameChange(e.target.value)}
          leftIcon={<StoreIcon className="w-5 h-5" />}
          autoFocus
        />

        <div>
          <Input
            label="Endereco do seu catalogo"
            placeholder="minha-loja"
            value={data.slug}
            onChange={(e) => handleSlugChange(e.target.value)}
            leftIcon={<LinkIcon className="w-5 h-5" />}
            error={slugError || undefined}
          />
          <div className="mt-2 flex items-center gap-2">
            <span className="text-sm text-gray-500 dark:text-gray-400">
              mercadovirtual.com/catalogo/
            </span>
            <span className="text-sm font-medium text-primary-600 dark:text-primary-400">
              {data.slug || 'sua-loja'}
            </span>
            {checkingSlug && (
              <span className="text-xs text-gray-400 animate-pulse">Verificando...</span>
            )}
            {!checkingSlug && slugAvailable === true && data.slug.length >= 3 && (
              <span className="text-xs text-green-500 flex items-center gap-1">
                <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                </svg>
                Disponivel
              </span>
            )}
          </div>
        </div>

        <Button
          onClick={onNext}
          disabled={!canProceed}
          className="w-full"
        >
          Continuar
          <ArrowForwardIcon className="w-5 h-5 ml-2" />
        </Button>
      </div>
    </Card>
  );
}
