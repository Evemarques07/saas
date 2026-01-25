import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { toast } from 'react-hot-toast';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { supabase } from '../../services/supabase';
import { uploadCompanyLogo } from '../../services/storage';
import { OnboardingProgress } from './components/OnboardingProgress';
import { StepCompanyName } from './components/StepCompanyName';
import { StepSegments } from './components/StepSegments';
import { StepLogo } from './components/StepLogo';

interface OnboardingData {
  companyName: string;
  slug: string;
  segments: string[];
  logoFile: File | null;
  logoPreview: string | null;
}

export function OnboardingPage() {
  const navigate = useNavigate();
  const { profile, refreshProfile } = useAuth();
  const { theme } = useTheme();
  const [step, setStep] = useState(1);
  const [loading, setLoading] = useState(false);
  const [data, setData] = useState<OnboardingData>({
    companyName: '',
    slug: '',
    segments: [],
    logoFile: null,
    logoPreview: null,
  });

  const handleComplete = async () => {
    if (!profile) {
      toast.error('Voce precisa estar logado');
      navigate('/login');
      return;
    }

    setLoading(true);

    try {
      // 1. Criar empresa (sem logo inicialmente)
      const { data: company, error: companyError } = await supabase
        .from('companies')
        .insert({
          name: data.companyName,
          slug: data.slug,
          segments: data.segments,
          is_active: true,
        })
        .select()
        .single();

      if (companyError) {
        console.error('Error creating company:', companyError);
        if (companyError.code === '23505') {
          toast.error('Este endereco ja esta em uso. Volte e escolha outro.');
        } else {
          toast.error('Erro ao criar empresa');
        }
        return;
      }

      // 2. Upload da logo (se houver)
      if (data.logoFile) {
        try {
          const { url } = await uploadCompanyLogo(data.logoFile, company.id);
          await supabase
            .from('companies')
            .update({ logo_url: url })
            .eq('id', company.id);
        } catch (logoError) {
          console.error('Error uploading logo:', logoError);
          // Nao e critico, continuar sem logo
        }
      }

      // 3. Adicionar usuario como admin da empresa
      const { error: memberError } = await supabase.from('company_members').insert({
        user_id: profile.id,
        company_id: company.id,
        role: 'admin',
        is_active: true,
      });

      if (memberError) {
        console.error('Error adding member:', memberError);
        // Rollback: deletar empresa criada
        await supabase.from('companies').delete().eq('id', company.id);
        toast.error('Erro ao vincular usuario a empresa');
        return;
      }

      // 4. Marcar onboarding como completo
      const { error: profileError } = await supabase
        .from('profiles')
        .update({ onboarding_completed: true })
        .eq('id', profile.id);

      if (profileError) {
        console.error('Error updating profile:', profileError);
        // Nao e critico, continuar mesmo assim
      }

      // 5. Atualizar contexto
      await refreshProfile();

      toast.success('Sua loja foi criada com sucesso!');

      // 6. Redirecionar para o dashboard da nova empresa
      navigate(`/app/${company.slug}`);
    } catch (err) {
      console.error('Error in onboarding:', err);
      toast.error('Erro ao criar sua loja');
    } finally {
      setLoading(false);
    }
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-primary-50 via-white to-purple-50 dark:from-gray-900 dark:via-gray-900 dark:to-gray-800 flex flex-col items-center justify-center p-4">
      {/* Logo */}
      <div className="mb-6">
        <img
          src={theme === 'dark' ? '/mercadoVirtualBranco.png' : '/mercadoVirtualPreto.png'}
          alt="Mercado Virtual"
          className="h-12 w-auto object-contain"
        />
      </div>

      {/* Progress */}
      <OnboardingProgress currentStep={step} totalSteps={3} />

      {/* Steps */}
      <div className="w-full max-w-lg">
        {step === 1 && (
          <StepCompanyName
            data={data}
            onChange={setData}
            onNext={() => setStep(2)}
          />
        )}
        {step === 2 && (
          <StepSegments
            data={data}
            onChange={setData}
            onNext={() => setStep(3)}
            onBack={() => setStep(1)}
          />
        )}
        {step === 3 && (
          <StepLogo
            data={data}
            onChange={setData}
            onComplete={handleComplete}
            onBack={() => setStep(2)}
            loading={loading}
          />
        )}
      </div>

      {/* Help link */}
      <p className="mt-8 text-sm text-gray-500 dark:text-gray-400">
        Precisa de ajuda?{' '}
        <a
          href="mailto:suporte@mercadovirtual.com"
          className="text-primary-600 hover:text-primary-700"
        >
          Fale conosco
        </a>
      </p>
    </div>
  );
}
