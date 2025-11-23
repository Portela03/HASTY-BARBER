import React, { useState, useEffect, useRef } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import type { Barbearia } from '../types';
import { barbershopService, barberService, getBarbeariaConfig, serviceService } from '../services/api';

// Componentes refatorados
import { DashboardHeader } from './Dashboard/DashboardHeader';
import { OnboardingBanner } from './Dashboard/OnboardingBanner';
import { DashboardCard } from './Dashboard/DashboardCard';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast } = useToast();

  // Estados básicos
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
  const [uploadingUserAvatar] = useState(false);
  const headerMenuRef = useRef<HTMLDivElement | null>(null);
  const fileInputUserRef = useRef<HTMLInputElement | null>(null);

  // Handlers
  const handleLogout = async () => {
    await logout();
    navigate('/login');
  };

  const openUserFilePicker = () => fileInputUserRef.current?.click();
  const openProfileModal = () => {
    // TODO: Implementar modal de perfil
    console.log('Abrir perfil');
  };
  const openBarbershopModal = () => {
    // TODO: Implementar modal de barbearia
    console.log('Abrir barbearia');
  };

  // Onboarding check
  useEffect(() => {
    let mounted = true;
    const runOnboardingCheck = async () => {
      if (!user || user.tipo_usuario !== 'proprietario') return;
      try {
        const shops = await barbershopService.listMine();
        const mine = (shops || [])[0];
        const shopId = mine?.id_barbearia ?? null;
        if (!shopId) return;
        
        const [cfgRes, barbersRes, servicesRes] = await Promise.allSettled([
          getBarbeariaConfig(Number(shopId)),
          barberService.listByBarbershop(Number(shopId), { onlyActive: false }),
          serviceService.listByBarbershop(Number(shopId)),
        ]);
        
        let missingHours = false;
        if (cfgRes.status === 'fulfilled') {
          const cfg = cfgRes.value;
          missingHours = !cfg?.business_hours || Object.keys(cfg.business_hours).length === 0;
        }
        
        let missingBarbers = true;
        if (barbersRes.status === 'fulfilled') {
          missingBarbers = (barbersRes.value || []).length === 0;
        }
        
        let missingServices = true;
        if (servicesRes.status === 'fulfilled') {
          missingServices = (servicesRes.value || []).length === 0;
        }
        
        if (mounted) setOnboarding({ missingHours, missingBarbers, missingServices, barbershopId: shopId });
      } catch {
        // ignore onboarding check errors
      }
    };
    runOnboardingCheck();
    return () => { mounted = false; };
  }, [user]);

  // Carregar barbearias
  useEffect(() => {
    const loadShops = async () => {
      if (!user) return;
      try {
        let data: Barbearia[] = [];
        if (user.tipo_usuario === 'proprietario') {
          data = await barbershopService.listMine();
        } else {
          data = await barbershopService.list();
        }
        if (data[0]) {
          setSelectedShopId(data[0].id_barbearia);
        }
      } catch (err) {
        console.error('Erro ao carregar barbearias:', err);
      }
    };
    loadShops();
  }, [user]);

  if (!user) {
    return null;
  }

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <DashboardHeader
        user={user}
        uploadingAvatar={uploadingUserAvatar}
        onAvatarClick={openUserFilePicker}
        onProfileClick={openProfileModal}
        onBarbershopClick={openBarbershopModal}
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
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                  </svg>
                }
                title="Cadastrar Barbeiro"
                description="Adicione novos profissionais à sua equipe"
                actionText="Cadastrar"
                onClick={() => console.log('Cadastrar barbeiro')}
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
                onClick={() => console.log('Cadastrar serviço')}
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
                onClick={async () => {
                  try {
                    let shops: Barbearia[] = [];
                    try {
                      shops = await barbershopService.listMine();
                    } catch {
                      shops = await barbershopService.list();
                    }
                    const first = shops[0];
                    if (first) navigate(`/barbearias/${first.id_barbearia}/bookings`);
                    else alert('Nenhuma barbearia encontrada.');
                  } catch {
                    alert('Erro ao localizar barbearia.');
                  }
                }}
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
                onClick={() => {
                  if (selectedShopId) {
                    navigate(`/barbearias/${selectedShopId}/reports`);
                  } else {
                    alert('Selecione uma barbearia.');
                  }
                }}
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
              onClick={async () => {
                try {
                  let shops: Barbearia[] = [];
                  try {
                    shops = await barbershopService.listMine();
                  } catch {
                    shops = await barbershopService.list();
                  }
                  for (const s of shops) {
                    try {
                      const list = await barberService.listByBarbershop(s.id_barbearia, { onlyActive: false });
                      const me = (list || []).find((b: { id_usuario?: number; id_barbeiro?: number }) => Number(b?.id_usuario) === Number(user.id_usuario));
                      if (me && me.id_barbeiro) {
                        const id = me.id_barbeiro;
                        navigate(`/barbeiros/${Number(id)}/bookings`);
                        return;
                      }
                    } catch {
                      // ignore and try next shop
                    }
                  }
                  // Fallback
                  const first = shops[0];
                  if (first) navigate(`/barbearias/${first.id_barbearia}/bookings`);
                  else alert('Nenhuma barbearia encontrada.');
                } catch {
                  alert('Erro ao localizar barbearia.');
                }
              }}
              fullWidth
            />
          )}

          {/* Cards para Cliente */}
          {user.tipo_usuario === 'cliente' && (
            <>
              <DashboardCard
                icon={
                  <svg className="h-6 w-6 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a3 3 0 01-3 3H6a3 3 0 01-3-3V8a1 1 0 011-1h3z" />
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
                onClick={() => navigate('/my-appointments')}
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
                onClick={() => navigate('/appointment-history')}
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
        onChange={() => console.log('Upload avatar')}
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
    </div>
  );
};

export default Dashboard;
