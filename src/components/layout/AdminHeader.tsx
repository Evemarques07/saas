import { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import StorefrontIcon from '@mui/icons-material/Storefront';
import { useAuth } from '../../contexts/AuthContext';
import { useTheme } from '../../contexts/ThemeContext';
import { buildAppPath } from '../../routes/paths';

export function AdminHeader() {
  const navigate = useNavigate();
  const { profile, companies, signOut } = useAuth();
  const { theme, toggleTheme } = useTheme();

  const [showUserMenu, setShowUserMenu] = useState(false);

  const handleSignOut = async () => {
    await signOut();
    navigate('/login');
  };

  const handleGoToCompany = (slug: string) => {
    navigate(buildAppPath(slug));
  };

  return (
    <header className="h-14 mx-4 mt-4 bg-gray-800 border border-gray-700 rounded-2xl shadow-sm flex items-center justify-between px-4">
      {/* Left Side - Title */}
      <div className="flex items-center gap-2">
        <span className="text-lg font-semibold text-white">
          Painel Administrativo
        </span>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Go to Company (if has any) */}
        {companies.length > 0 && (
          <button
            onClick={() => handleGoToCompany(companies[0].company!.slug)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg text-gray-300 hover:bg-gray-700 transition-colors"
            title="Ir para empresa"
          >
            <StorefrontIcon className="w-5 h-5" />
            <span className="text-sm hidden sm:block">Ir para Loja</span>
          </button>
        )}

        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-400 hover:bg-gray-700 transition-colors"
          title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
        >
          {theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-700 transition-colors"
          >
            <div className="w-8 h-8 rounded-full bg-primary-600 flex items-center justify-center">
              <PersonIcon className="w-5 h-5 text-white" />
            </div>
            <span className="text-sm font-medium text-gray-200 hidden sm:block">
              {profile?.full_name || profile?.email}
            </span>
            <KeyboardArrowDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-48 bg-gray-800 rounded-lg shadow-lg border border-gray-700 py-1 z-20">
                <div className="px-4 py-2 border-b border-gray-700">
                  <p className="text-sm font-medium text-gray-100">
                    {profile?.full_name}
                  </p>
                  <p className="text-xs text-gray-400">
                    {profile?.email}
                  </p>
                  <p className="text-xs text-primary-400 mt-1">
                    Super Admin
                  </p>
                </div>
                <button
                  onClick={handleSignOut}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-400 hover:bg-gray-700 transition-colors"
                >
                  <LogoutIcon className="w-4 h-4" />
                  Sair
                </button>
              </div>
            </>
          )}
        </div>
      </div>
    </header>
  );
}
