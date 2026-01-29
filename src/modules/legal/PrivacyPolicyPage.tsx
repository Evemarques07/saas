import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '../../contexts/ThemeContext';

export function PrivacyPolicyPage() {
  const { theme } = useTheme();

  return (
    <div className="min-h-screen bg-gray-50 dark:bg-gray-900">
      {/* Header */}
      <header className="bg-white dark:bg-gray-800 shadow-sm">
        <div className="max-w-4xl mx-auto px-4 py-4 flex items-center gap-4">
          <Link
            to="/"
            className="text-gray-500 hover:text-gray-700 dark:text-gray-400 dark:hover:text-gray-200"
          >
            <ArrowBackIcon />
          </Link>
          <img
            src={theme === 'dark' ? '/mercadoVirtualBranco.png' : '/mercadoVirtualPreto.png'}
            alt="Mercado Virtual"
            className="h-8 w-auto"
          />
        </div>
      </header>

      {/* Content */}
      <main className="max-w-4xl mx-auto px-4 py-8">
        <div className="bg-white dark:bg-gray-800 rounded-lg shadow-sm p-8">
          <h1 className="text-3xl font-bold text-gray-900 dark:text-white mb-2">
            Politica de Privacidade
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Ultima atualizacao: Janeiro de 2026
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                1. Introducao
              </h2>
              <p>
                O Mercado Virtual ("nos", "nosso" ou "Plataforma") valoriza a privacidade dos seus usuarios.
                Esta Politica de Privacidade descreve como coletamos, usamos, armazenamos e protegemos suas
                informacoes pessoais quando voce utiliza nossa plataforma de gestao de vendas.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                2. Informacoes que Coletamos
              </h2>
              <p>Coletamos os seguintes tipos de informacoes:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Informacoes de Conta:</strong> Nome, email, telefone e senha quando voce cria uma conta.
                </li>
                <li>
                  <strong>Informacoes de Empresa:</strong> Nome da empresa, CNPJ, endereco e dados de contato.
                </li>
                <li>
                  <strong>Dados de Uso:</strong> Informacoes sobre como voce utiliza a plataforma, incluindo
                  produtos cadastrados, vendas realizadas e interacoes com clientes.
                </li>
                <li>
                  <strong>Informacoes de Pagamento:</strong> Dados necessarios para processar assinaturas e
                  pagamentos atraves de nossos parceiros de pagamento.
                </li>
                <li>
                  <strong>Dados de Login Social:</strong> Quando voce faz login com Google, recebemos seu
                  nome, email e foto de perfil.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                3. Como Usamos suas Informacoes
              </h2>
              <p>Utilizamos suas informacoes para:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Fornecer e manter nossos servicos</li>
                <li>Processar transacoes e gerenciar sua conta</li>
                <li>Enviar comunicacoes importantes sobre o servico</li>
                <li>Melhorar e personalizar sua experiencia</li>
                <li>Cumprir obrigacoes legais e regulatorias</li>
                <li>Proteger contra fraudes e uso indevido</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                4. Compartilhamento de Informacoes
              </h2>
              <p>
                Nao vendemos suas informacoes pessoais. Podemos compartilhar dados com:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Provedores de Servico:</strong> Empresas que nos ajudam a operar a plataforma
                  (hospedagem, pagamentos, email).
                </li>
                <li>
                  <strong>Parceiros de Integracao:</strong> Quando voce ativa integracoes como WhatsApp
                  ou gateways de pagamento.
                </li>
                <li>
                  <strong>Autoridades Legais:</strong> Quando exigido por lei ou para proteger nossos direitos.
                </li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                5. Seguranca dos Dados
              </h2>
              <p>
                Implementamos medidas de seguranca tecnicas e organizacionais para proteger suas informacoes,
                incluindo:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Criptografia de dados em transito e em repouso</li>
                <li>Autenticacao segura e controle de acesso</li>
                <li>Monitoramento continuo de seguranca</li>
                <li>Backups regulares</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                6. Seus Direitos
              </h2>
              <p>
                De acordo com a Lei Geral de Protecao de Dados (LGPD), voce tem direito a:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Acessar seus dados pessoais</li>
                <li>Corrigir dados incompletos ou desatualizados</li>
                <li>Solicitar a exclusao de seus dados</li>
                <li>Revogar consentimento a qualquer momento</li>
                <li>Solicitar a portabilidade dos dados</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                7. Retencao de Dados
              </h2>
              <p>
                Mantemos suas informacoes pelo tempo necessario para fornecer nossos servicos e cumprir
                obrigacoes legais. Apos o encerramento da conta, seus dados serao retidos por um periodo
                de 5 anos para fins fiscais e legais, conforme legislacao brasileira.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                8. Cookies e Tecnologias Similares
              </h2>
              <p>
                Utilizamos cookies e tecnologias similares para melhorar sua experiencia, manter sua
                sessao ativa e analisar o uso da plataforma. Voce pode gerenciar suas preferencias de
                cookies atraves das configuracoes do seu navegador.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                9. Alteracoes nesta Politica
              </h2>
              <p>
                Podemos atualizar esta Politica de Privacidade periodicamente. Notificaremos voce sobre
                mudancas significativas atraves de email ou aviso na plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                10. Contato
              </h2>
              <p>
                Para duvidas sobre esta politica ou para exercer seus direitos, entre em contato:
              </p>
              <ul className="list-none space-y-1 mt-2">
                <li><strong>Email:</strong> privacidade@mercadovirtual.app</li>
                <li><strong>Responsavel:</strong> Everton Marques</li>
              </ul>
            </section>
          </div>
        </div>
      </main>

      {/* Footer */}
      <footer className="max-w-4xl mx-auto px-4 py-8 text-center text-gray-500 dark:text-gray-400 text-sm">
        <p>Mercado Virtual - Todos os direitos reservados</p>
        <div className="flex justify-center gap-4 mt-2">
          <Link to="/termos" className="hover:text-primary-600">
            Termos de Servico
          </Link>
          <span>|</span>
          <Link to="/" className="hover:text-primary-600">
            Voltar ao inicio
          </Link>
        </div>
      </footer>
    </div>
  );
}
