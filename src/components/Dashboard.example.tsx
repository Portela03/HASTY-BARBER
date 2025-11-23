/**
 * EXEMPLO DE DASHBOARD REFATORADO
 * 
 * Este arquivo mostra como o Dashboard.tsx ficaria após a refatoração completa,
 * utilizando os componentes e hooks criados.
 * 
 * Redução estimada: de ~3400 linhas para ~400-600 linhas
 */

import React, { useRef, useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../contexts/AuthContext';
import { useToast } from '../hooks/useToast';
import { useProfile } from '../hooks/useProfile';
import { useBarbershop } from '../hooks/useBarbershop';

// Componentes
import { DashboardHeader, OnboardingBanner, DashboardCard } from './Dashboard';
import { ConfirmationModal } from './common/ConfirmationModal';
import { Toast } from './Toast';

// Tipos
import { Barbearia } from '../types';

const DashboardRefactored: React.FC = () => {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError, warning } = useToast();

  // Estados básicos
  const [barbershops, setBarbershops] = useState<Barbearia[]>([]);
  const [selectedShopId, setSelectedShopId] = useState<number | ''>('');
  const [onboarding, setOnboarding] = useState({
    missingHours: false,
    missingBarbers: false,
    missingServices: false,
    barbershopId: null as number | null,
  });
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(true);
  
  // Header
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const [uploadingUserAvatar, setUploadingUserAvatar] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputUserRef = useRef<HTMLInputElement | null>(null);

  // Hooks customizados
  const profileHook = useProfile({
    user,
    token,
    login,
    onSuccess: success,
    onError: showError,
    onWarning: warning,
  });

  const barbershopHook = useBarbershop({
    selectedShopId,
    setSelectedShopId,
    barbershops,
    setBarbershops,
    onSuccess: success,
    onError: showError,
    onWarning: warning,
  });

  // Handlers
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openUserFilePicker = () => fileInputUserRef.current?.click();

  if (!user) return null;

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <DashboardHeader
        user={user}
        uploadingAvatar={uploadingUserAvatar}
        onAvatarClick={openUserFilePicker}
        onProfileClick={profileHook.openProfileModal}
        onBarbershopClick={barbershopHook.openBarbershopModal}
        onLogout={handleLogout}
        menuOpen={headerMenuOpen}
        setMenuOpen={setHeaderMenuOpen}
        menuRef={headerMenuRef}
      />

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {/* Welcome Section */}
        <div className="mb-8">
          <h2 className="text-3xl font-bold text-white mb-2">
            Olá, {user.nome?.split(' ')[0] || 'Usuário'}! 👋
          </h2>
          <p className="text-gray-400">
            {user.tipo_usuario === 'proprietario' && 'Gerencie sua barbearia'}
            {user.tipo_usuario === 'barbeiro' && 'Confira seus atendimentos'}
            {user.tipo_usuario === 'cliente' && 'Agende seu próximo corte'}
          </p>
        </div>

        {/* Onboarding Banner */}
        {user.tipo_usuario === 'proprietario' && 
         showOnboardingBanner && 
         (onboarding.missingHours || onboarding.missingBarbers || onboarding.missingServices) && (
          <OnboardingBanner
            onboarding={onboarding}
            onDismiss={() => setShowOnboardingBanner(false)}
          />
        )}

        {/* Dashboard Cards Grid */}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6">
          {/* Cards para Proprietário */}
          {user.tipo_usuario === 'proprietario' && (
            <>
              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                }
                title="Cadastrar Barbeiro"
                description="Adicione novos profissionais à sua equipe"
                actionText="Cadastrar"
                onClick={() => {/* handler */}}
              />
              
              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
                title="Cadastrar Serviço"
                description="Defina os serviços oferecidos"
                actionText="Adicionar"
                onClick={() => {/* handler */}}
              />

              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                title="Ver Agendamentos"
                description="Acompanhe todos os agendamentos"
                actionText="Visualizar"
                onClick={() => {/* handler */}}
              />

              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
                  </svg>
                }
                title="Verificar Relatórios"
                description="Análise completa do desempenho"
                actionText="Ver relatórios"
                onClick={() => {/* handler */}}
                badge="Insights"
                fullWidth
              />
            </>
          )}

          {/* Cards para Barbeiro */}
          {user.tipo_usuario === 'barbeiro' && (
            <DashboardCard
              icon={
                <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
              }
              title="Meus Agendamentos"
              description="Visualize e gerencie seus atendimentos"
              actionText="Ver agendamentos"
              onClick={() => {/* handler */}}
              fullWidth
            />
          )}

          {/* Cards para Cliente */}
          {user.tipo_usuario === 'cliente' && (
            <>
              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 6v6m0 0v6m0-6h6m-6 0H6" />
                  </svg>
                }
                title="Agendar Serviço"
                description="Encontre a melhor barbearia para você"
                actionText="Agendar"
                onClick={() => navigate('/booking')}
                badge="Popular"
              />

              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                  </svg>
                }
                title="Meus Agendamentos"
                description="Acompanhe seus próximos horários"
                actionText="Visualizar"
                onClick={() => {/* handler */}}
              />

              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                }
                title="Histórico"
                description="Veja seus agendamentos anteriores"
                actionText="Ver histórico"
                onClick={() => {/* handler */}}
              />
            </>
          )}
        </div>
      </main>

      {/* Input oculto para upload de avatar */}
      <input
        ref={fileInputUserRef}
        type="file"
        accept="image/*"
        onChange={(e) => {/* handleUserAvatarSelected(e) */}}
        className="hidden"
      />

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast
            key={toast.id}
            message={toast.message}
            type={toast.type}
            onClose={() => removeToast(toast.id)}
          />
        ))}
      </div>

      {/* Modais reutilizáveis */}
      <ConfirmationModal
        isOpen={false /* algum estado */}
        title="Exemplo"
        message="Mensagem de confirmação"
        onConfirm={() => {}}
        onCancel={() => {}}
        variant="danger"
      />

      {/* Profile Modal - seria transformado em componente também */}
      {/* Barbershop Modal - seria transformado em componente também */}
      {/* Review Modal - seria transformado em componente também */}
      {/* Etc... */}
    </div>
  );
};

export default DashboardRefactored;
