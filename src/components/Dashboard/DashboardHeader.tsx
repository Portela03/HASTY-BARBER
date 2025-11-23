import React from 'react';
import { useNavigate } from 'react-router-dom';
import type { User } from '../../types';

interface DashboardHeaderProps {
  user: User;
  onProfileClick: () => void;
  onBarbershopClick: () => void;
  onLogout: () => void;
  menuOpen: boolean;
  setMenuOpen: (open: boolean) => void;
  menuRef: React.RefObject<HTMLDivElement | null>;
  onboarding: {
    missingHours: boolean;
    missingBarbers: boolean;
    missingServices: boolean;
    barbershopId: number | null;
  };
  barbershops: Array<{ id_barbearia: number }>;
}

export const DashboardHeader: React.FC<DashboardHeaderProps> = ({
  user,
  onProfileClick,
  onBarbershopClick,
  onLogout,
  menuOpen,
  setMenuOpen,
  menuRef,
  onboarding,
  barbershops,
}) => {
  const navigate = useNavigate();
  
  const hasOnboardingTasks = user.tipo_usuario === 'proprietario' && 
    barbershops.length > 0 &&
    (onboarding.missingHours || onboarding.missingBarbers || onboarding.missingServices);

  return (
    <header className="sticky top-0 z-30 bg-gray-900/80 backdrop-blur-xl border-b border-gray-800/50">
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8">
        <div className="flex justify-between items-center py-4">
          {/* Logo */}
          <div className="flex items-center gap-3">
            <div className="w-10 h-10 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-xl flex items-center justify-center shadow-lg shadow-amber-500/20">
              <svg className="w-6 h-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
              </svg>
            </div>
            <h1 className="text-2xl font-bold bg-gradient-to-r from-amber-400 to-yellow-500 bg-clip-text text-transparent">
              Hasty Barber
            </h1>
          </div>

          {/* User menu */}
          <div className="flex items-center gap-4">
            {/* Botão Completar Cadastro */}
            {hasOnboardingTasks && (
              <button
                onClick={() => navigate(`/barbearias/${onboarding.barbershopId}/config`)}
                className="hidden sm:flex items-center gap-2 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:shadow-amber-500/20"
              >
                <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
                <span className="text-sm">Completar Cadastro</span>
              </button>
            )}
            
            <div className="relative" ref={menuRef}>
              <button
                onClick={() => setMenuOpen(!menuOpen)}
                className="flex items-center gap-3 px-4 py-2 rounded-xl bg-gray-800/50 hover:bg-gray-800 transition-all border border-gray-700/50 hover:border-amber-500/50"
              >
                <div className="relative">
                  <div className="h-8 w-8 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-medium overflow-hidden">
                    {user.avatar_url ? (
                      <img src={user.avatar_url} alt={user.nome} className="h-full w-full object-cover" />
                    ) : (
                      (() => {
                        const name = user.nome?.trim() || '';
                        const initials = name
                          ? name.split(' ').filter(Boolean).slice(0, 2).map(p => p[0]?.toUpperCase()).join('')
                          : 'U';
                        return initials;
                      })()
                    )}
                  </div>
                </div>
                <div className="text-left hidden sm:block">
                  <p className="text-sm font-medium text-white">{user.nome}</p>
                  <p className="text-xs text-gray-400 capitalize">{user.tipo_usuario}</p>
                </div>
                <svg
                  className={`h-5 w-5 text-gray-400 transition-transform ${menuOpen ? 'rotate-180' : ''}`}
                  fill="none"
                  viewBox="0 0 24 24"
                  stroke="currentColor"
                >
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 9l-7 7-7-7" />
                </svg>
              </button>

              {menuOpen && (
                <div className="absolute right-0 mt-2 w-56 bg-gray-800 rounded-xl shadow-xl border border-gray-700 py-2 z-50">
                  <button
                    onClick={() => {
                      onProfileClick();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                    </svg>
                    Meu Perfil
                  </button>
                  {user.tipo_usuario === 'proprietario' && (
                    <button
                      onClick={() => {
                        onBarbershopClick();
                        setMenuOpen(false);
                      }}
                      className="w-full px-4 py-2 text-left text-sm text-gray-300 hover:bg-gray-700 hover:text-white flex items-center gap-3"
                    >
                      <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                      </svg>
                      Editar Barbearia
                    </button>
                  )}
                  <hr className="my-2 border-gray-700" />
                  <button
                    onClick={() => {
                      onLogout();
                      setMenuOpen(false);
                    }}
                    className="w-full px-4 py-2 text-left text-sm text-red-400 hover:bg-gray-700 hover:text-red-300 flex items-center gap-3"
                  >
                    <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 16l4-4m0 0l-4-4m4 4H7m6 4v1a3 3 0 01-3 3H6a3 3 0 01-3-3V7a3 3 0 013-3h4a3 3 0 013 3v1" />
                    </svg>
                    Sair
                  </button>
                </div>
              )}
            </div>
          </div>
        </div>
      </div>
    </header>
  );
};
