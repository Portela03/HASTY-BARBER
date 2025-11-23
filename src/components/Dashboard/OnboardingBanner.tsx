import React from 'react';
import { useNavigate } from 'react-router-dom';

interface OnboardingBannerProps {
  onboarding: {
    missingHours: boolean;
    missingBarbers: boolean;
    missingServices: boolean;
    barbershopId?: number | null;
  };
  onDismiss: () => void;
}

export const OnboardingBanner: React.FC<OnboardingBannerProps> = ({ onboarding, onDismiss }) => {
  const navigate = useNavigate();

  return (
    <div className="relative bg-gradient-to-br from-amber-500/10 to-yellow-600/10 border border-amber-500/30 rounded-2xl p-6 mb-8">
      <div className="absolute top-0 right-0 w-32 h-32 bg-amber-500/5 rounded-full blur-3xl"></div>
      
      <div className="relative z-10">
        <div className="flex items-start justify-between gap-4 mb-4">
          <div className="flex items-center gap-3">
            <div className="p-2 bg-amber-500/20 rounded-xl">
              <svg className="h-6 w-6 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
            </div>
            <div>
              <h3 className="text-lg font-semibold text-white">Complete o cadastro da sua barbearia</h3>
              <p className="text-sm text-gray-400 mt-1">Algumas informações estão faltando para começar</p>
            </div>
          </div>
          <button
            onClick={onDismiss}
            className="text-gray-400 hover:text-white transition-colors p-1"
            title="Dispensar"
          >
            <svg className="h-5 w-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
            </svg>
          </button>
        </div>

        <div className="grid gap-3 mb-4">
          {onboarding.missingHours && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-gray-300">Defina o horário de funcionamento</span>
            </div>
          )}
          {onboarding.missingBarbers && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-gray-300">Cadastre pelo menos um barbeiro</span>
            </div>
          )}
          {onboarding.missingServices && (
            <div className="flex items-center gap-3 text-sm">
              <div className="h-2 w-2 rounded-full bg-amber-500"></div>
              <span className="text-gray-300">Adicione serviços oferecidos</span>
            </div>
          )}
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          {onboarding.barbershopId && (
            <button
              onClick={() => navigate(`/barbearias/${onboarding.barbershopId}/config`)}
              className="px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white rounded-xl font-medium transition-all shadow-lg hover:shadow-xl hover:shadow-amber-500/20"
            >
              Completar Cadastro
            </button>
          )}
          <button
            onClick={onDismiss}
            className="px-4 py-2 bg-gray-800/80 hover:bg-gray-700/80 text-gray-300 hover:text-white border border-gray-700/50 hover:border-gray-600 rounded-xl font-medium transition-all"
          >
            Não mostrar novamente
          </button>
        </div>
      </div>
    </div>
  );
};
