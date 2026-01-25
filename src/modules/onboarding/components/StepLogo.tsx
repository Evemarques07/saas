import { useState, useRef, useEffect } from 'react';
import AddPhotoAlternateIcon from '@mui/icons-material/AddPhotoAlternate';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import DeleteIcon from '@mui/icons-material/Delete';
import RocketLaunchIcon from '@mui/icons-material/RocketLaunch';
import { Button, Card } from '../../../components/ui';
import { toast } from 'react-hot-toast';

interface OnboardingData {
  companyName: string;
  slug: string;
  segments: string[];
  logoFile: File | null;
  logoPreview: string | null;
}

interface StepLogoProps {
  data: OnboardingData;
  onChange: (data: OnboardingData) => void;
  onComplete: () => void;
  onBack: () => void;
  loading?: boolean;
}

export function StepLogo({ data, onChange, onComplete, onBack, loading }: StepLogoProps) {
  const fileInputRef = useRef<HTMLInputElement>(null);

  // Limpar URL de preview ao desmontar
  useEffect(() => {
    return () => {
      if (data.logoPreview) {
        URL.revokeObjectURL(data.logoPreview);
      }
    };
  }, []);

  const handleFileSelect = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;

    // Validar tipo
    if (!file.type.startsWith('image/')) {
      toast.error('Selecione uma imagem valida');
      return;
    }

    // Validar tamanho (max 2MB)
    if (file.size > 2 * 1024 * 1024) {
      toast.error('A imagem deve ter no maximo 2MB');
      return;
    }

    // Criar preview local
    const previewUrl = URL.createObjectURL(file);

    // Revogar preview anterior se existir
    if (data.logoPreview) {
      URL.revokeObjectURL(data.logoPreview);
    }

    onChange({ ...data, logoFile: file, logoPreview: previewUrl });
  };

  const handleRemoveLogo = () => {
    if (data.logoPreview) {
      URL.revokeObjectURL(data.logoPreview);
    }
    onChange({ ...data, logoFile: null, logoPreview: null });
  };

  return (
    <Card className="p-6 md:p-8 w-full max-w-lg mx-auto">
      <div className="text-center mb-6">
        <div className="w-16 h-16 bg-green-100 dark:bg-green-900/30 rounded-2xl flex items-center justify-center mx-auto mb-4">
          <AddPhotoAlternateIcon className="w-8 h-8 text-green-600" />
        </div>
        <h2 className="text-xl md:text-2xl font-bold text-gray-900 dark:text-white mb-2">
          Adicione sua logo
        </h2>
        <p className="text-gray-500 dark:text-gray-400">
          Uma boa logo ajuda seus clientes a reconhecerem sua marca
        </p>
      </div>

      <div className="mb-6">
        {data.logoPreview ? (
          <div className="relative w-32 h-32 mx-auto">
            <img
              src={data.logoPreview}
              alt="Logo da loja"
              className="w-full h-full object-contain rounded-2xl border-2 border-gray-200 dark:border-gray-700"
            />
            <button
              type="button"
              onClick={handleRemoveLogo}
              className="absolute -top-2 -right-2 w-8 h-8 bg-red-500 hover:bg-red-600 text-white rounded-full flex items-center justify-center shadow-lg transition-colors"
            >
              <DeleteIcon className="w-4 h-4" />
            </button>
          </div>
        ) : (
          <button
            type="button"
            onClick={() => fileInputRef.current?.click()}
            className="w-full h-40 border-2 border-dashed border-gray-300 dark:border-gray-600 rounded-2xl flex flex-col items-center justify-center gap-3 hover:border-primary-500 hover:bg-primary-50 dark:hover:bg-primary-900/10 transition-all cursor-pointer"
          >
            <AddPhotoAlternateIcon className="w-10 h-10 text-gray-400" />
            <span className="text-sm text-gray-500">Clique para selecionar uma imagem</span>
            <span className="text-xs text-gray-400">PNG, JPG ou WEBP (max 2MB)</span>
          </button>
        )}

        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleFileSelect}
          className="hidden"
        />
      </div>

      {/* Preview da loja */}
      <div className="bg-gray-50 dark:bg-gray-800/50 rounded-xl p-4 mb-6">
        <p className="text-xs text-gray-500 dark:text-gray-400 mb-3 text-center">
          Preview do seu catalogo
        </p>
        <div className="flex items-center gap-3 bg-white dark:bg-gray-800 rounded-lg p-3 shadow-sm">
          {data.logoPreview ? (
            <img
              src={data.logoPreview}
              alt="Logo"
              className="w-10 h-10 object-contain rounded-lg"
            />
          ) : (
            <div className="w-10 h-10 bg-primary-100 dark:bg-primary-900/30 rounded-lg flex items-center justify-center">
              <span className="text-lg font-bold text-primary-600">
                {data.companyName.charAt(0).toUpperCase()}
              </span>
            </div>
          )}
          <div>
            <p className="font-semibold text-gray-900 dark:text-white text-sm">
              {data.companyName}
            </p>
            <p className="text-xs text-gray-500">
              /{data.slug}
            </p>
          </div>
        </div>
      </div>

      <div className="flex gap-3">
        <Button
          variant="secondary"
          onClick={onBack}
          disabled={loading}
          className="flex-1"
        >
          <ArrowBackIcon className="w-5 h-5 mr-2" />
          Voltar
        </Button>
        <Button
          onClick={onComplete}
          loading={loading}
          className="flex-1"
        >
          <RocketLaunchIcon className="w-5 h-5 mr-2" />
          Criar minha loja
        </Button>
      </div>

      {!data.logoPreview && (
        <p className="text-xs text-center text-gray-400 mt-4">
          Voce pode adicionar a logo depois nas configuracoes
        </p>
      )}
    </Card>
  );
}
