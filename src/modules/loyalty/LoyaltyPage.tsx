import { useState, useEffect } from 'react';
import AddIcon from '@mui/icons-material/Add';
import EditIcon from '@mui/icons-material/Edit';
import DeleteIcon from '@mui/icons-material/Delete';
import StarsIcon from '@mui/icons-material/Stars';
import SaveIcon from '@mui/icons-material/Save';
import { PageContainer } from '../../components/layout/PageContainer';
import { Button, Card, Input, Modal, ModalFooter } from '../../components/ui';
import { PageLoader } from '../../components/ui/Loader';
import { useTenant } from '../../contexts/TenantContext';
import { supabase } from '../../services/supabase';
import { LoyaltyConfig, LoyaltyLevel } from '../../types';
import toast from 'react-hot-toast';

export function LoyaltyPage() {
  const { currentCompany } = useTenant();
  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);

  // Config state
  const [config, setConfig] = useState<LoyaltyConfig | null>(null);
  const [enabled, setEnabled] = useState(false);
  const [pointsPerReal, setPointsPerReal] = useState('1');
  const [pointsValue, setPointsValue] = useState('0.01');
  const [minPointsRedeem, setMinPointsRedeem] = useState('100');
  const [maxDiscountPercent, setMaxDiscountPercent] = useState('50');

  // Levels state
  const [levels, setLevels] = useState<LoyaltyLevel[]>([]);
  const [levelModalOpen, setLevelModalOpen] = useState(false);
  const [editingLevel, setEditingLevel] = useState<LoyaltyLevel | null>(null);
  const [savingLevel, setSavingLevel] = useState(false);
  const [deleteLevelModalOpen, setDeleteLevelModalOpen] = useState(false);
  const [levelToDelete, setLevelToDelete] = useState<LoyaltyLevel | null>(null);

  // Level form
  const [levelName, setLevelName] = useState('');
  const [levelMinPoints, setLevelMinPoints] = useState('');
  const [levelMultiplier, setLevelMultiplier] = useState('1.0');
  const [levelColor, setLevelColor] = useState('#6366f1');
  const [levelBenefits, setLevelBenefits] = useState('');

  useEffect(() => {
    if (currentCompany) {
      fetchData();
    }
  }, [currentCompany]);

  const fetchData = async () => {
    if (!currentCompany) return;

    setLoading(true);

    // Fetch config
    const { data: configData } = await supabase
      .from('loyalty_config')
      .select('*')
      .eq('company_id', currentCompany.id)
      .maybeSingle();

    if (configData) {
      setConfig(configData);
      setEnabled(configData.enabled);
      setPointsPerReal(configData.points_per_real.toString());
      setPointsValue(configData.points_value.toString());
      setMinPointsRedeem(configData.min_points_redeem.toString());
      setMaxDiscountPercent(configData.max_discount_percent.toString());
    }

    // Fetch levels
    const { data: levelsData } = await supabase
      .from('loyalty_levels')
      .select('*')
      .eq('company_id', currentCompany.id)
      .order('min_points', { ascending: true });

    setLevels(levelsData || []);

    setLoading(false);
  };

  const handleSaveConfig = async () => {
    if (!currentCompany) return;

    setSaving(true);

    const configData = {
      company_id: currentCompany.id,
      enabled,
      points_per_real: parseFloat(pointsPerReal) || 1,
      points_value: parseFloat(pointsValue) || 0.01,
      min_points_redeem: parseInt(minPointsRedeem) || 100,
      max_discount_percent: parseInt(maxDiscountPercent) || 50,
    };

    if (config) {
      // Update existing
      const { error } = await supabase
        .from('loyalty_config')
        .update(configData)
        .eq('id', config.id);

      if (error) {
        console.error('Error updating loyalty config:', error);
        toast.error('Erro ao salvar configurações');
      } else {
        toast.success('Configurações salvas!');
      }
    } else {
      // Create new
      const { error } = await supabase.from('loyalty_config').insert(configData);

      if (error) {
        console.error('Error creating loyalty config:', error);
        toast.error('Erro ao salvar configurações');
      } else {
        toast.success('Programa de fidelidade ativado!');
        fetchData();
      }
    }

    setSaving(false);
  };

  const resetLevelForm = () => {
    setLevelName('');
    setLevelMinPoints('');
    setLevelMultiplier('1.0');
    setLevelColor('#6366f1');
    setLevelBenefits('');
    setEditingLevel(null);
  };

  const openCreateLevelModal = () => {
    resetLevelForm();
    setLevelModalOpen(true);
  };

  const openEditLevelModal = (level: LoyaltyLevel) => {
    setEditingLevel(level);
    setLevelName(level.name);
    setLevelMinPoints(level.min_points.toString());
    setLevelMultiplier(level.points_multiplier.toString());
    setLevelColor(level.color || '#6366f1');
    setLevelBenefits(level.benefits?.join('\n') || '');
    setLevelModalOpen(true);
  };

  const handleSaveLevel = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!currentCompany) return;

    if (!levelName.trim()) {
      toast.error('Informe o nome do nível');
      return;
    }

    if (!levelMinPoints || parseInt(levelMinPoints) < 0) {
      toast.error('Informe pontos mínimos válidos');
      return;
    }

    setSavingLevel(true);

    const benefitsArray = levelBenefits
      .split('\n')
      .map((b) => b.trim())
      .filter((b) => b);

    const levelData = {
      company_id: currentCompany.id,
      name: levelName.trim(),
      min_points: parseInt(levelMinPoints),
      points_multiplier: parseFloat(levelMultiplier) || 1.0,
      color: levelColor,
      benefits: benefitsArray,
      sort_order: editingLevel?.sort_order ?? levels.length,
    };

    if (editingLevel) {
      const { error } = await supabase
        .from('loyalty_levels')
        .update(levelData)
        .eq('id', editingLevel.id);

      if (error) {
        console.error('Error updating level:', error);
        toast.error('Erro ao atualizar nível');
      } else {
        toast.success('Nível atualizado!');
        setLevelModalOpen(false);
        fetchData();
      }
    } else {
      const { error } = await supabase.from('loyalty_levels').insert(levelData);

      if (error) {
        console.error('Error creating level:', error);
        toast.error('Erro ao criar nível');
      } else {
        toast.success('Nível criado!');
        setLevelModalOpen(false);
        fetchData();
      }
    }

    setSavingLevel(false);
  };

  const handleDeleteLevel = async () => {
    if (!levelToDelete) return;

    const { error } = await supabase.from('loyalty_levels').delete().eq('id', levelToDelete.id);

    if (error) {
      console.error('Error deleting level:', error);
      toast.error('Erro ao excluir nível');
    } else {
      toast.success('Nível excluído!');
      fetchData();
    }

    setDeleteLevelModalOpen(false);
    setLevelToDelete(null);
  };

  if (loading) {
    return <PageLoader />;
  }

  return (
    <PageContainer
      title="Programa de Fidelidade"
      subtitle="Configure pontos e níveis para seus clientes"
    >
      <div className="space-y-6">
        {/* Configuration Card */}
        <Card className="p-6">
          <div className="flex items-center gap-3 mb-6">
            <div className="p-2 rounded-lg bg-amber-100 dark:bg-amber-900/30">
              <StarsIcon className="text-amber-600 dark:text-amber-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Configurações do Programa
              </h2>
              <p className="text-sm text-gray-500">
                Defina como os clientes ganham e usam pontos
              </p>
            </div>
          </div>

          <div className="space-y-6">
            {/* Enable/Disable */}
            <label className="flex items-center gap-3 cursor-pointer">
              <div className={`relative w-12 h-6 rounded-full transition-colors ${
                enabled ? 'bg-amber-500' : 'bg-gray-300 dark:bg-gray-600'
              }`}>
                <div className={`absolute top-1 w-4 h-4 bg-white rounded-full transition-transform ${
                  enabled ? 'translate-x-7' : 'translate-x-1'
                }`} />
              </div>
              <input
                type="checkbox"
                checked={enabled}
                onChange={(e) => setEnabled(e.target.checked)}
                className="sr-only"
              />
              <span className="text-sm font-medium text-gray-900 dark:text-white">
                Programa de Fidelidade {enabled ? 'Ativo' : 'Inativo'}
              </span>
            </label>

            {enabled && (
              <>
                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Pontos por R$ 1 gasto"
                    type="number"
                    step="0.1"
                    min="0.1"
                    value={pointsPerReal}
                    onChange={(e) => setPointsPerReal(e.target.value)}
                    helperText="Quantos pontos o cliente ganha a cada R$ 1"
                  />
                  <Input
                    label="Valor de cada ponto (R$)"
                    type="number"
                    step="0.001"
                    min="0.001"
                    value={pointsValue}
                    onChange={(e) => setPointsValue(e.target.value)}
                    helperText="Quanto vale cada ponto em desconto"
                  />
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                  <Input
                    label="Mínimo de pontos para resgatar"
                    type="number"
                    min="1"
                    value={minPointsRedeem}
                    onChange={(e) => setMinPointsRedeem(e.target.value)}
                    helperText="Pontos mínimos para usar no checkout"
                  />
                  <Input
                    label="Desconto máximo por pedido (%)"
                    type="number"
                    min="1"
                    max="100"
                    value={maxDiscountPercent}
                    onChange={(e) => setMaxDiscountPercent(e.target.value)}
                    helperText="Porcentagem máxima de desconto com pontos"
                  />
                </div>

                {/* Preview */}
                <div className="p-4 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                  <h4 className="text-sm font-medium text-gray-700 dark:text-gray-300 mb-2">
                    Exemplo de como funciona:
                  </h4>
                  <ul className="text-sm text-gray-600 dark:text-gray-400 space-y-1">
                    <li>
                      Cliente compra R$ 100 → Ganha{' '}
                      <strong>{Math.floor(100 * (parseFloat(pointsPerReal) || 1))} pontos</strong>
                    </li>
                    <li>
                      Cliente tem 500 pontos → Pode usar até{' '}
                      <strong>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(500 * (parseFloat(pointsValue) || 0.01))}
                      </strong>{' '}
                      de desconto
                    </li>
                    <li>
                      Em um pedido de R$ 200, desconto máximo:{' '}
                      <strong>
                        {new Intl.NumberFormat('pt-BR', {
                          style: 'currency',
                          currency: 'BRL',
                        }).format(200 * ((parseInt(maxDiscountPercent) || 50) / 100))}
                      </strong>
                    </li>
                  </ul>
                </div>
              </>
            )}

            <Button onClick={handleSaveConfig} loading={saving} icon={<SaveIcon />}>
              Salvar Configurações
            </Button>
          </div>
        </Card>

        {/* Levels Card */}
        {enabled && (
          <Card className="p-6">
            <div className="flex items-center justify-between mb-6">
              <div>
                <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                  Níveis de Fidelidade
                </h2>
                <p className="text-sm text-gray-500">
                  Crie níveis com benefícios e multiplicadores de pontos
                </p>
              </div>
              <Button icon={<AddIcon />} onClick={openCreateLevelModal}>
                Novo Nível
              </Button>
            </div>

            {levels.length === 0 ? (
              <div className="text-center py-8 text-gray-500 dark:text-gray-400">
                <StarsIcon className="w-12 h-12 mx-auto mb-2 opacity-50" />
                <p>Nenhum nível cadastrado</p>
                <p className="text-sm">Crie níveis para engajar seus clientes</p>
              </div>
            ) : (
              <div className="space-y-3">
                {levels.map((level) => (
                  <div
                    key={level.id}
                    className="flex items-center gap-4 p-4 rounded-xl border-2"
                    style={{ borderColor: level.color }}
                  >
                    <div
                      className="w-4 h-4 rounded-full flex-shrink-0"
                      style={{ backgroundColor: level.color }}
                    />
                    <div className="flex-1">
                      <p className="font-semibold text-gray-900 dark:text-white">{level.name}</p>
                      <p className="text-sm text-gray-500">
                        {level.min_points.toLocaleString('pt-BR')} pontos
                        {level.points_multiplier > 1 && (
                          <span className="ml-2 text-amber-600 dark:text-amber-400">
                            ({level.points_multiplier}x pontos)
                          </span>
                        )}
                      </p>
                      {level.benefits && level.benefits.length > 0 && (
                        <p className="text-xs text-gray-400 mt-1">
                          {level.benefits.length} benefício(s)
                        </p>
                      )}
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => openEditLevelModal(level)}
                        className="p-2 text-gray-500 hover:text-primary-600 dark:hover:text-primary-400 transition-colors"
                      >
                        <EditIcon className="w-4 h-4" />
                      </button>
                      <button
                        onClick={() => {
                          setLevelToDelete(level);
                          setDeleteLevelModalOpen(true);
                        }}
                        className="p-2 text-gray-500 hover:text-red-600 dark:hover:text-red-400 transition-colors"
                      >
                        <DeleteIcon className="w-4 h-4" />
                      </button>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </Card>
        )}
      </div>

      {/* Level Modal */}
      <Modal
        isOpen={levelModalOpen}
        onClose={() => !savingLevel && setLevelModalOpen(false)}
        title={editingLevel ? 'Editar Nível' : 'Novo Nível'}
      >
        <form onSubmit={handleSaveLevel}>
          <div className="space-y-4">
            <Input
              label="Nome do Nível *"
              placeholder="Bronze, Prata, Ouro..."
              value={levelName}
              onChange={(e) => setLevelName(e.target.value)}
              required
            />

            <div className="grid grid-cols-2 gap-4">
              <Input
                label="Pontos Mínimos *"
                type="number"
                min="0"
                placeholder="1000"
                value={levelMinPoints}
                onChange={(e) => setLevelMinPoints(e.target.value)}
                helperText="Pontos acumulados para atingir"
                required
              />
              <Input
                label="Multiplicador de Pontos"
                type="number"
                step="0.1"
                min="1"
                placeholder="1.5"
                value={levelMultiplier}
                onChange={(e) => setLevelMultiplier(e.target.value)}
                helperText="1.5 = ganha 50% mais pontos"
              />
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Cor do Nível
              </label>
              <div className="flex items-center gap-3">
                <input
                  type="color"
                  value={levelColor}
                  onChange={(e) => setLevelColor(e.target.value)}
                  className="w-10 h-10 rounded cursor-pointer border border-gray-300 dark:border-gray-600"
                />
                <Input
                  value={levelColor}
                  onChange={(e) => setLevelColor(e.target.value)}
                  placeholder="#6366f1"
                  className="flex-1"
                />
              </div>
            </div>

            <div>
              <label className="block text-sm font-medium text-gray-700 dark:text-gray-300 mb-1">
                Benefícios (um por linha)
              </label>
              <textarea
                value={levelBenefits}
                onChange={(e) => setLevelBenefits(e.target.value)}
                placeholder="Frete grátis em compras acima de R$ 100&#10;Acesso antecipado a promoções&#10;Atendimento prioritário"
                rows={4}
                className="w-full px-3 py-2 border border-gray-300 dark:border-gray-600 rounded-lg
                  bg-white dark:bg-gray-700 text-gray-900 dark:text-gray-100
                  focus:ring-2 focus:ring-primary-500 focus:border-transparent
                  placeholder:text-gray-400 dark:placeholder:text-gray-500 resize-none"
              />
            </div>
          </div>

          <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
            <Button
              type="button"
              variant="secondary"
              onClick={() => setLevelModalOpen(false)}
              disabled={savingLevel}
            >
              Cancelar
            </Button>
            <Button type="submit" loading={savingLevel} icon={<StarsIcon />}>
              {editingLevel ? 'Salvar' : 'Criar Nível'}
            </Button>
          </ModalFooter>
        </form>
      </Modal>

      {/* Delete Level Confirmation */}
      <Modal
        isOpen={deleteLevelModalOpen}
        onClose={() => setDeleteLevelModalOpen(false)}
        title="Excluir Nível"
      >
        <p className="text-gray-600 dark:text-gray-400">
          Tem certeza que deseja excluir o nível{' '}
          <span className="font-bold">{levelToDelete?.name}</span>? Clientes neste nível não serão
          afetados, mas perderão os benefícios associados.
        </p>
        <ModalFooter className="mt-6 -mx-6 -mb-4 px-6">
          <Button variant="secondary" onClick={() => setDeleteLevelModalOpen(false)}>
            Cancelar
          </Button>
          <Button variant="danger" onClick={handleDeleteLevel}>
            Excluir
          </Button>
        </ModalFooter>
      </Modal>
    </PageContainer>
  );
}
