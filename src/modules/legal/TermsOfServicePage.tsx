import { Link } from 'react-router-dom';
import ArrowBackIcon from '@mui/icons-material/ArrowBack';
import { useTheme } from '../../contexts/ThemeContext';

export function TermsOfServicePage() {
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
            Termos de Servico
          </h1>
          <p className="text-gray-500 dark:text-gray-400 mb-8">
            Ultima atualizacao: Janeiro de 2026
          </p>

          <div className="prose dark:prose-invert max-w-none space-y-6 text-gray-700 dark:text-gray-300">
            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                1. Aceitacao dos Termos
              </h2>
              <p>
                Ao acessar ou usar o Mercado Virtual ("Plataforma"), voce concorda em estar vinculado
                a estes Termos de Servico. Se voce nao concordar com qualquer parte dos termos, nao
                podera acessar o servico.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                2. Descricao do Servico
              </h2>
              <p>
                O Mercado Virtual e uma plataforma SaaS (Software as a Service) de gestao de vendas
                que oferece:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Gestao de produtos e estoque</li>
                <li>Registro e acompanhamento de vendas</li>
                <li>Catalogo digital para seus clientes</li>
                <li>Gestao de clientes (CRM)</li>
                <li>Cupons de desconto e programas de fidelidade</li>
                <li>Integracoes com WhatsApp e sistemas de pagamento</li>
                <li>Relatorios e dashboards</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                3. Cadastro e Conta
              </h2>
              <p>
                Para usar a Plataforma, voce deve:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Ter pelo menos 18 anos de idade</li>
                <li>Fornecer informacoes verdadeiras e completas</li>
                <li>Manter a seguranca de sua conta e senha</li>
                <li>Notificar-nos imediatamente sobre uso nao autorizado</li>
              </ul>
              <p className="mt-3">
                Voce e responsavel por todas as atividades realizadas em sua conta.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                4. Planos e Pagamento
              </h2>
              <p>
                A Plataforma oferece diferentes planos de assinatura:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>
                  <strong>Plano Gratuito:</strong> Recursos limitados para pequenos negocios.
                </li>
                <li>
                  <strong>Planos Pagos:</strong> Recursos avancados com cobranca mensal ou anual.
                </li>
              </ul>
              <p className="mt-3">
                Os pagamentos sao processados atraves de parceiros de pagamento autorizados.
                Nao armazenamos dados completos de cartao de credito em nossos servidores.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                5. Uso Aceitavel
              </h2>
              <p>Voce concorda em nao:</p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Violar leis ou regulamentos aplicaveis</li>
                <li>Infringir direitos de propriedade intelectual</li>
                <li>Transmitir virus ou codigo malicioso</li>
                <li>Tentar acessar sistemas sem autorizacao</li>
                <li>Usar a plataforma para atividades ilegais ou fraudulentas</li>
                <li>Revender ou sublicenciar o servico sem autorizacao</li>
                <li>Interferir no funcionamento da plataforma</li>
              </ul>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                6. Propriedade Intelectual
              </h2>
              <p>
                A Plataforma e todo seu conteudo, recursos e funcionalidades sao de propriedade
                exclusiva do Mercado Virtual e estao protegidos por leis de propriedade intelectual.
              </p>
              <p className="mt-3">
                Voce mantem a propriedade dos dados que insere na plataforma (produtos, clientes,
                vendas, etc.).
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                7. Disponibilidade e Continuidade do Servico
              </h2>
              <p>
                Nos esforcamos para manter a plataforma disponivel 24/7, mas nao garantimos
                disponibilidade ininterrupta. Podemos realizar manutencoes programadas com aviso
                previo sempre que possivel.
              </p>
              <p className="mt-3">
                <strong>Continuidade do Servico:</strong> O Mercado Virtual e um projeto independente
                que pode sofrer alteracoes ou ser descontinuado por razoes economicas, tecnicas ou
                operacionais. Nesse caso:
              </p>
              <ul className="list-disc pl-6 space-y-2 mt-2">
                <li>Voce sera notificado com no minimo <strong>60 dias de antecedencia</strong></li>
                <li>Todos os seus dados serao exportados e enviados ao seu email</li>
                <li>Assinaturas pagas terao reembolso proporcional ao periodo nao utilizado</li>
              </ul>
              <p className="mt-3">
                Recomendamos que voce mantenha backups periodicos dos seus dados atraves da funcao
                de exportacao disponivel na plataforma.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                8. Limitacao de Responsabilidade
              </h2>
              <p>
                O Mercado Virtual nao sera responsavel por:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Danos indiretos, incidentais ou consequenciais</li>
                <li>Perda de lucros, dados ou oportunidades de negocio</li>
                <li>Falhas causadas por terceiros ou forca maior</li>
                <li>Conteudo inserido pelos usuarios</li>
              </ul>
              <p className="mt-3">
                Nossa responsabilidade total sera limitada ao valor pago pelo servico nos
                ultimos 12 meses.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                9. Cancelamento e Rescisao
              </h2>
              <p>
                Voce pode cancelar sua conta a qualquer momento atraves das configuracoes da
                plataforma. Apos o cancelamento:
              </p>
              <ul className="list-disc pl-6 space-y-2">
                <li>Seu acesso sera encerrado ao final do periodo pago</li>
                <li>Seus dados serao retidos por 30 dias para possivel reativacao</li>
                <li>Apos 30 dias, os dados serao excluidos permanentemente</li>
              </ul>
              <p className="mt-3">
                Podemos suspender ou encerrar sua conta por violacao destes termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                10. Alteracoes nos Termos
              </h2>
              <p>
                Reservamo-nos o direito de modificar estes termos a qualquer momento.
                Notificaremos voce sobre mudancas significativas com pelo menos 30 dias
                de antecedencia. O uso continuado apos as alteracoes constitui aceitacao
                dos novos termos.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                11. Lei Aplicavel
              </h2>
              <p>
                Estes termos serao regidos pelas leis da Republica Federativa do Brasil.
                Qualquer disputa sera resolvida no foro da comarca de residencia do usuario,
                conforme o Codigo de Defesa do Consumidor.
              </p>
            </section>

            <section>
              <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-3">
                12. Contato
              </h2>
              <p>
                Para duvidas sobre estes termos, entre em contato:
              </p>
              <ul className="list-none space-y-1 mt-2">
                <li><strong>Email:</strong> contato@mercadovirtual.app</li>
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
          <Link to="/privacidade" className="hover:text-primary-600">
            Politica de Privacidade
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
