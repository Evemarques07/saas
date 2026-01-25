import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { LandingPage } from '../modules/landing/LandingPage';
import { FullPageLoader } from '../components/ui/Loader';
import { buildAppPath } from './paths';

export function RootOrLanding() {
  const { user, loading, companies, isSuperAdmin } = useAuth();

  // Enquanto carrega, mostra a landing page (melhor UX que loader)
  if (loading) {
    return <LandingPage />;
  }

  // Usuario nao logado - mostra landing page
  if (!user) {
    return <LandingPage />;
  }

  // Usuario logado - redireciona para o app apropriado

  // Super admin sem empresas vai para /admin
  if (isSuperAdmin && companies.length === 0) {
    return <Navigate to="/admin" replace />;
  }

  // Usuario com empresas vai para primeira empresa
  const firstCompany = companies[0]?.company;
  if (firstCompany) {
    return <Navigate to={buildAppPath(firstCompany.slug)} replace />;
  }

  // Super admin com empresas tambem pode ir para /admin
  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  // Usuario sem empresas - mostra mensagem (ou landing temporariamente)
  return (
    <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
      <div className="text-center p-8">
        <h1 className="text-2xl font-bold text-gray-900 dark:text-white mb-4">
          Sem acesso a empresas
        </h1>
        <p className="text-gray-600 dark:text-gray-400 mb-6">
          Voce ainda nao foi adicionado a nenhuma empresa.
        </p>
        <button
          onClick={() => window.location.href = '/login'}
          className="text-indigo-600 hover:text-indigo-700 font-medium"
        >
          Voltar para login
        </button>
      </div>
    </div>
  );
}
