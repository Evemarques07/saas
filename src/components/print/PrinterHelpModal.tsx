/**
 * PrinterHelpModal - Modal com guia de configuracao de impressora de rede
 */

import { useState } from 'react';
import CloseIcon from '@mui/icons-material/Close';
import HelpOutlineIcon from '@mui/icons-material/HelpOutline';
import PrintIcon from '@mui/icons-material/Print';
import RouterIcon from '@mui/icons-material/Router';
import SettingsIcon from '@mui/icons-material/Settings';
import CheckCircleIcon from '@mui/icons-material/CheckCircle';
import ExpandMoreIcon from '@mui/icons-material/ExpandMore';
import { Button } from '../ui/Button';

interface PrinterHelpModalProps {
  isOpen: boolean;
  onClose: () => void;
}

export function PrinterHelpModal({ isOpen, onClose }: PrinterHelpModalProps) {
  const [expandedSection, setExpandedSection] = useState<string | null>('passo1');

  if (!isOpen) return null;

  const toggleSection = (section: string) => {
    setExpandedSection(expandedSection === section ? null : section);
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/50">
      <div className="bg-white dark:bg-gray-800 rounded-xl shadow-2xl max-w-2xl w-full max-h-[90vh] overflow-hidden">
        {/* Header */}
        <div className="flex items-center justify-between p-4 border-b border-gray-200 dark:border-gray-700 bg-primary-50 dark:bg-primary-900/20">
          <div className="flex items-center gap-3">
            <div className="p-2 rounded-lg bg-primary-100 dark:bg-primary-800">
              <HelpOutlineIcon className="text-primary-600 dark:text-primary-400" />
            </div>
            <div>
              <h2 className="text-lg font-semibold text-gray-900 dark:text-white">
                Como Configurar a Impressora de Rede
              </h2>
              <p className="text-sm text-gray-500 dark:text-gray-400">
                Guia passo a passo
              </p>
            </div>
          </div>
          <button
            onClick={onClose}
            className="p-2 text-gray-500 hover:text-gray-700 dark:hover:text-gray-300 hover:bg-gray-100 dark:hover:bg-gray-700 rounded-lg transition-colors"
          >
            <CloseIcon />
          </button>
        </div>

        {/* Content */}
        <div className="p-4 overflow-y-auto max-h-[calc(90vh-140px)]">
          {/* Intro */}
          <div className="mb-6 p-4 bg-blue-50 dark:bg-blue-900/20 rounded-lg border border-blue-200 dark:border-blue-800">
            <p className="text-sm text-blue-800 dark:text-blue-200">
              <strong>Impressoras compativeis:</strong> Epson, Elgin, Bematech, Jetway, Tanca e outras termicas com conexao de rede (Wi-Fi ou cabo).
            </p>
          </div>

          {/* Passo 1 */}
          <AccordionSection
            title="Passo 1: Descobrir o IP da Impressora"
            icon={<RouterIcon className="w-5 h-5" />}
            isOpen={expandedSection === 'passo1'}
            onToggle={() => toggleSection('passo1')}
          >
            <div className="space-y-4">
              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Opcao A: Imprimir pagina de configuracao
                </h4>
                <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Desligue a impressora</li>
                  <li>Segure o botao <strong>FEED</strong> (avanco de papel)</li>
                  <li>Ligue a impressora mantendo o botao pressionado</li>
                  <li>Solte quando comecar a imprimir</li>
                </ol>
                <p className="mt-2 text-sm text-gray-500 dark:text-gray-400">
                  O IP aparecera na folha (ex: 192.168.1.100)
                </p>
              </div>

              <div className="p-3 bg-gray-50 dark:bg-gray-700/50 rounded-lg">
                <h4 className="font-medium text-gray-900 dark:text-white mb-2">
                  Opcao B: Verificar no roteador
                </h4>
                <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-1 list-decimal list-inside">
                  <li>Acesse a pagina do roteador (geralmente 192.168.1.1)</li>
                  <li>Procure por "Dispositivos Conectados"</li>
                  <li>Localize a impressora pelo nome</li>
                </ol>
              </div>
            </div>
          </AccordionSection>

          {/* Passo 2 */}
          <AccordionSection
            title="Passo 2: Configurar no Sistema"
            icon={<SettingsIcon className="w-5 h-5" />}
            isOpen={expandedSection === 'passo2'}
            onToggle={() => toggleSection('passo2')}
          >
            <div className="space-y-3">
              <table className="w-full text-sm">
                <thead>
                  <tr className="border-b border-gray-200 dark:border-gray-600">
                    <th className="text-left py-2 text-gray-700 dark:text-gray-300">Campo</th>
                    <th className="text-left py-2 text-gray-700 dark:text-gray-300">O que colocar</th>
                  </tr>
                </thead>
                <tbody className="text-gray-600 dark:text-gray-400">
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">Ativar</td>
                    <td className="py-2">Marque para habilitar</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">Nome</td>
                    <td className="py-2">Ex: "Cozinha", "Balcao"</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">IP</td>
                    <td className="py-2">Ex: 192.168.1.100</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">Porta</td>
                    <td className="py-2">9100 (padrao)</td>
                  </tr>
                  <tr className="border-b border-gray-100 dark:border-gray-700">
                    <td className="py-2 font-medium">Largura</td>
                    <td className="py-2">80mm (mais comum) ou 58mm</td>
                  </tr>
                </tbody>
              </table>
            </div>
          </AccordionSection>

          {/* Passo 3 */}
          <AccordionSection
            title="Passo 3: Testar e Salvar"
            icon={<CheckCircleIcon className="w-5 h-5" />}
            isOpen={expandedSection === 'passo3'}
            onToggle={() => toggleSection('passo3')}
          >
            <div className="space-y-3">
              <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-decimal list-inside">
                <li>Clique em <strong>"Testar Conexao"</strong></li>
                <li>Aguarde a verificacao (alguns segundos)</li>
                <li>Se aparecer <span className="text-green-600">verde</span>, esta funcionando!</li>
                <li>Clique em <strong>"Salvar Configuracoes"</strong></li>
              </ol>

              <div className="p-3 bg-yellow-50 dark:bg-yellow-900/20 rounded-lg border border-yellow-200 dark:border-yellow-800">
                <p className="text-sm text-yellow-800 dark:text-yellow-200">
                  <strong>Dica:</strong> A impressora precisa estar ligada e na mesma rede Wi-Fi que voce.
                </p>
              </div>
            </div>
          </AccordionSection>

          {/* Passo 4 */}
          <AccordionSection
            title="Passo 4: Imprimir uma Venda"
            icon={<PrintIcon className="w-5 h-5" />}
            isOpen={expandedSection === 'passo4'}
            onToggle={() => toggleSection('passo4')}
          >
            <div className="space-y-3">
              <ol className="text-sm text-gray-600 dark:text-gray-300 space-y-2 list-decimal list-inside">
                <li>Va em <strong>Vendas</strong></li>
                <li>Clique em uma venda para ver os detalhes</li>
                <li>Clique no botao <strong>Imprimir</strong></li>
                <li>Selecione <strong>"Impressora de Rede"</strong></li>
              </ol>

              <div className="p-3 bg-green-50 dark:bg-green-900/20 rounded-lg border border-green-200 dark:border-green-800">
                <p className="text-sm text-green-800 dark:text-green-200">
                  Pronto! O comprovante sera impresso automaticamente.
                </p>
              </div>
            </div>
          </AccordionSection>

          {/* Problemas Comuns */}
          <AccordionSection
            title="Problemas Comuns"
            icon={<HelpOutlineIcon className="w-5 h-5" />}
            isOpen={expandedSection === 'problemas'}
            onToggle={() => toggleSection('problemas')}
          >
            <div className="space-y-3">
              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                  "Timeout na conexao"
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>Verifique se a impressora esta ligada</li>
                  <li>Confirme se o IP esta correto</li>
                  <li>Certifique-se de estar na mesma rede</li>
                </ul>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                  "Imprimiu caracteres estranhos"
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>Verifique se a largura do papel esta correta</li>
                  <li>Teste com 80mm primeiro</li>
                </ul>
              </div>

              <div className="p-3 bg-red-50 dark:bg-red-900/20 rounded-lg border border-red-200 dark:border-red-800">
                <h4 className="font-medium text-red-800 dark:text-red-200 mb-1">
                  "Nao aparece opcao de rede"
                </h4>
                <ul className="text-sm text-red-700 dark:text-red-300 space-y-1 list-disc list-inside">
                  <li>Somente administradores podem configurar</li>
                  <li>Verifique se salvou as configuracoes</li>
                </ul>
              </div>
            </div>
          </AccordionSection>
        </div>

        {/* Footer */}
        <div className="p-4 border-t border-gray-200 dark:border-gray-700 bg-gray-50 dark:bg-gray-900/50">
          <Button onClick={onClose} className="w-full">
            Entendi
          </Button>
        </div>
      </div>
    </div>
  );
}

/**
 * Accordion Section Component
 */
interface AccordionSectionProps {
  title: string;
  icon: React.ReactNode;
  isOpen: boolean;
  onToggle: () => void;
  children: React.ReactNode;
}

function AccordionSection({ title, icon, isOpen, onToggle, children }: AccordionSectionProps) {
  return (
    <div className="mb-3 border border-gray-200 dark:border-gray-700 rounded-lg overflow-hidden">
      <button
        onClick={onToggle}
        className="w-full flex items-center justify-between p-4 bg-gray-50 dark:bg-gray-700/50 hover:bg-gray-100 dark:hover:bg-gray-700 transition-colors"
      >
        <div className="flex items-center gap-3">
          <span className="text-primary-600 dark:text-primary-400">{icon}</span>
          <span className="font-medium text-gray-900 dark:text-white">{title}</span>
        </div>
        <ExpandMoreIcon
          className={`text-gray-500 transition-transform ${isOpen ? 'rotate-180' : ''}`}
        />
      </button>
      {isOpen && (
        <div className="p-4 bg-white dark:bg-gray-800">
          {children}
        </div>
      )}
    </div>
  );
}

/**
 * Help Button Component - Para usar na Settings Page
 */
interface PrinterHelpButtonProps {
  className?: string;
}

export function PrinterHelpButton({ className = '' }: PrinterHelpButtonProps) {
  const [showModal, setShowModal] = useState(false);

  return (
    <>
      <button
        onClick={() => setShowModal(true)}
        className={`inline-flex items-center gap-1 text-sm text-primary-600 dark:text-primary-400 hover:text-primary-700 dark:hover:text-primary-300 hover:underline ${className}`}
      >
        <HelpOutlineIcon className="w-4 h-4" />
        Como configurar?
      </button>

      <PrinterHelpModal
        isOpen={showModal}
        onClose={() => setShowModal(false)}
      />
    </>
  );
}
