import { Navigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { FullPageLoader } from '../components/ui/Loader';
import { redirectToSubdomain, isMainDomain } from './paths';

const STORAGE_KEY = 'ejym_current_company';

export function RootRedirect() {
  const { companies, loading, user, isSuperAdmin } = useAuth();

  if (loading) {
    return <FullPageLoader />;
  }

  if (!user) {
    return <Navigate to="/login" replace />;
  }

  // Super admin sem empresas vai para area admin
  if (isSuperAdmin && companies.length === 0) {
    return <Navigate to="/admin" replace />;
  }

  // Usuario sem empresas
  if (companies.length === 0) {
    return (
      <div className="min-h-screen flex items-center justify-center bg-gray-50 dark:bg-gray-900">
        <div className="text-center p-8 max-w-md">
          <h2 className="text-xl font-semibold text-gray-900 dark:text-white mb-2">
            Sem acesso a empresas
          </h2>
          <p className="text-gray-600 dark:text-gray-400 mb-4">
            Voce ainda nao tem acesso a nenhuma empresa.
            Entre em contato com o administrador para receber um convite.
          </p>
          <button
            onClick={() => {
              localStorage.clear();
              window.location.href = '/login';
            }}
            className="text-primary-600 hover:underline"
          >
            Voltar para login
          </button>
        </div>
      </div>
    );
  }

  // Verificar empresa salva no localStorage
  const savedCompanyId = localStorage.getItem(STORAGE_KEY);
  let targetCompany = companies[0]?.company;

  if (savedCompanyId) {
    const found = companies.find(c => c.company?.id === savedCompanyId);
    if (found?.company) {
      targetCompany = found.company;
    }
  }

  if (targetCompany) {
    // Se estamos no dominio principal, redireciona para subdominio
    if (isMainDomain()) {
      redirectToSubdomain(targetCompany.slug);
      return <FullPageLoader />;
    }
    // Ja estamos no subdominio, vai para raiz
    return <Navigate to="/" replace />;
  }

  // Super admin vai para admin
  if (isSuperAdmin) {
    return <Navigate to="/admin" replace />;
  }

  return <Navigate to="/login" replace />;
}
