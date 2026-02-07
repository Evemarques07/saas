import { useState } from 'react';
import LightModeIcon from '@mui/icons-material/LightMode';
import DarkModeIcon from '@mui/icons-material/DarkMode';
import PersonIcon from '@mui/icons-material/Person';
import LogoutIcon from '@mui/icons-material/Logout';
import BusinessIcon from '@mui/icons-material/Business';
import KeyboardArrowDownIcon from '@mui/icons-material/KeyboardArrowDown';
import MenuIcon from '@mui/icons-material/Menu';
import { useAuth } from '../../contexts/AuthContext';
import { useTenant } from '../../contexts/TenantContext';
import { useTheme } from '../../contexts/ThemeContext';

interface HeaderProps {
  onMenuClick?: () => void;
  isMobile?: boolean;
}

export function Header({ onMenuClick, isMobile = false }: HeaderProps) {
  const { user, profile, companies, signOut } = useAuth();
  const { currentCompany, switchCompany } = useTenant();
  const { theme, toggleTheme } = useTheme();

  // Avatar: profile.avatar_url > user.user_metadata.avatar_url (Supabase/Google) > fallback icon
  const avatarUrl = profile?.avatar_url || user?.user_metadata?.avatar_url || null;

  const [showUserMenu, setShowUserMenu] = useState(false);
  const [showCompanyMenu, setShowCompanyMenu] = useState(false);

  const handleSignOut = async (e: React.MouseEvent) => {
    e.stopPropagation();
    e.preventDefault();
    console.log('[Header] ====== BOTAO SAIR CLICADO ======');
    try {
      console.log('[Header] Chamando signOut...');
      await signOut();
      console.log('[Header] signOut concluido');
    } catch (err) {
      console.error('[Header] Erro no signOut:', err);
    }
  };

  return (
    <header className="z-40 h-14 mx-2 md:mx-4 mt-2 md:mt-4 mb-2 md:mb-4 flex-shrink-0 bg-white dark:bg-gray-900 border border-gray-200 dark:border-gray-800 rounded-2xl shadow-sm flex items-center justify-between px-2 md:px-4">
      {/* Left Side - Menu button (mobile) + Company Selector */}
      <div className="flex items-center gap-1 md:gap-2">
        {/* Mobile Menu Button */}
        {isMobile && onMenuClick && (
          <button
            onClick={onMenuClick}
            className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
            title="Menu"
          >
            <MenuIcon />
          </button>
        )}

        {/* Company Selector */}
        <div className="relative">
          {companies.length > 0 && (
            companies.length > 1 ? (
              <button
                onClick={() => setShowCompanyMenu(!showCompanyMenu)}
                className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
              >
                {currentCompany?.logo_url ? (
                  <img
                    src={currentCompany.logo_url}
                    alt={currentCompany.name}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg object-cover"
                  />
                ) : (
                  <BusinessIcon className="w-5 h-5 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block max-w-[120px] md:max-w-none truncate">
                  {currentCompany?.name || 'Selecionar empresa'}
                </span>
                <KeyboardArrowDownIcon className="w-4 h-4 text-gray-400" />
              </button>
            ) : (
              <div className="flex items-center gap-1 md:gap-2 px-2 md:px-3 py-2">
                {currentCompany?.logo_url ? (
                  <img
                    src={currentCompany.logo_url}
                    alt={currentCompany.name}
                    className="w-7 h-7 md:w-8 md:h-8 rounded-lg object-cover"
                  />
                ) : (
                  <BusinessIcon className="w-5 h-5 text-gray-500" />
                )}
                <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block max-w-[120px] md:max-w-none truncate">
                  {currentCompany?.name}
                </span>
              </div>
            )
          )}

        {showCompanyMenu && companies.length > 1 && (
          <>
            <div className="fixed inset-0 z-10" onClick={() => setShowCompanyMenu(false)} />
            <div className="absolute left-0 top-full mt-1 w-64 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-1 z-20">
              {companies.map((membership) => (
                <button
                  key={membership.company?.id}
                  onClick={() => {
                    if (membership.company) {
                      switchCompany(membership.company);
                    }
                    setShowCompanyMenu(false);
                  }}
                  className={`
                    w-full flex items-center gap-3 px-4 py-2 text-sm transition-colors
                    ${currentCompany?.id === membership.company?.id
                      ? 'bg-primary-50 text-primary-600 dark:bg-primary-900/20 dark:text-primary-400'
                      : 'text-gray-700 dark:text-gray-200 hover:bg-gray-100 dark:hover:bg-gray-800'
                    }
                  `}
                >
                  {membership.company?.logo_url ? (
                    <img
                      src={membership.company.logo_url}
                      alt={membership.company.name}
                      className="w-6 h-6 rounded object-cover"
                    />
                  ) : (
                    <BusinessIcon className="w-6 h-6 text-gray-400" />
                  )}
                  <span>{membership.company?.name}</span>
                </button>
              ))}
            </div>
          </>
        )}
        </div>
      </div>

      {/* Right Side */}
      <div className="flex items-center gap-2">
        {/* Theme Toggle */}
        <button
          onClick={toggleTheme}
          className="p-2 rounded-lg text-gray-500 hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          title={theme === 'light' ? 'Ativar tema escuro' : 'Ativar tema claro'}
        >
          {theme === 'light' ? <DarkModeIcon /> : <LightModeIcon />}
        </button>

        {/* User Menu */}
        <div className="relative">
          <button
            onClick={() => setShowUserMenu(!showUserMenu)}
            className="flex items-center gap-2 px-3 py-2 rounded-lg hover:bg-gray-100 dark:hover:bg-gray-800 transition-colors"
          >
            {avatarUrl ? (
              <img
                src={avatarUrl}
                alt={profile?.full_name || 'Avatar'}
                className="w-8 h-8 rounded-full object-cover"
                referrerPolicy="no-referrer"
              />
            ) : (
              <div className="w-8 h-8 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                <PersonIcon className="w-5 h-5 text-primary-600 dark:text-primary-400" />
              </div>
            )}
            <span className="text-sm font-medium text-gray-700 dark:text-gray-200 hidden sm:block">
              {profile?.full_name || profile?.email}
            </span>
            <KeyboardArrowDownIcon className="w-4 h-4 text-gray-400" />
          </button>

          {showUserMenu && (
            <>
              <div className="fixed inset-0 z-10" onClick={() => setShowUserMenu(false)} />
              <div className="absolute right-0 top-full mt-1 w-56 bg-white dark:bg-gray-900 rounded-lg shadow-lg border border-gray-200 dark:border-gray-800 py-1 z-20">
                <div className="px-4 py-3 border-b border-gray-200 dark:border-gray-800 flex items-center gap-3">
                  {avatarUrl ? (
                    <img
                      src={avatarUrl}
                      alt={profile?.full_name || 'Avatar'}
                      className="w-10 h-10 rounded-full object-cover"
                      referrerPolicy="no-referrer"
                    />
                  ) : (
                    <div className="w-10 h-10 rounded-full bg-primary-100 dark:bg-primary-900/30 flex items-center justify-center">
                      <PersonIcon className="w-6 h-6 text-primary-600 dark:text-primary-400" />
                    </div>
                  )}
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-gray-900 dark:text-gray-100 truncate">
                      {profile?.full_name}
                    </p>
                    <p className="text-xs text-gray-500 dark:text-gray-400 truncate">
                      {profile?.email}
                    </p>
                  </div>
                </div>
                <button
                  onClick={(e) => handleSignOut(e)}
                  className="w-full flex items-center gap-2 px-4 py-2 text-sm text-red-600 hover:bg-red-50 dark:hover:bg-red-900/20 transition-colors"
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
