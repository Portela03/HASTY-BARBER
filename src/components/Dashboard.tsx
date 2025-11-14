import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import type { BookingForm, BookingRequest, BookingResponse, Barbearia, Barbeiro, User } from '../types';
import { bookingService, barbershopService, barberService, uploadService, evaluationService, rescheduleService, serviceService, userService, clearFinalizadosGlobal, clearFinalizadosBarbearia, clearFinalizadosBarbeiro, getBarbeariaConfig } from '../services/api';
import { timeToMinutes, isValidTimeHHMM } from '../utils/validation';
import type { ServiceItem } from '../types';
import type { ReviewTarget } from '../types';

const Dashboard: React.FC = () => {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError, warning, info } = useToast();

  // Booking panel state
  const [showBooking, setShowBooking] = useState(false);
  const [booking, setBooking] = useState<BookingForm>({
    service: [],
    date: '',
    time: '',
    barber_id: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [barbershops, setBarbershops] = useState<Barbearia[]>([]);
  const [isLoadingBarbershops, setIsLoadingBarbershops] = useState(false);
  const [barbershopError, setBarbershopError] = useState<string | null>(null);
  const [selectedBarbershopId, setSelectedBarbershopId] = useState<number | ''>('');
  const [bookingStep, setBookingStep] = useState<1 | 2>(1);
  const [availableBarbers, setAvailableBarbers] = useState<Barbeiro[] | null>(null);
  const [isLoadingAvailableBarbers, setIsLoadingAvailableBarbers] = useState(false);
  const [availableBarbersError, setAvailableBarbersError] = useState<string | null>(null);
  // Booking: services loaded for selected barbershop (step 2)
  const [bookingServices, setBookingServices] = useState<ServiceItem[] | null>(null);
  const [isLoadingBookingServices, setIsLoadingBookingServices] = useState(false);
  const [bookingServicesError, setBookingServicesError] = useState<string | null>(null);
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState<number | null>(null);

  // Onboarding checklist for proprietario: missing hours, barbers, services
  const [onboarding, setOnboarding] = useState<{ missingHours: boolean; missingBarbers: boolean; missingServices: boolean; barbershopId?: number | null }>({ missingHours: false, missingBarbers: false, missingServices: false, barbershopId: null });
  const [showOnboardingBanner, setShowOnboardingBanner] = useState(true);

  // Slide-over: Meus Agendamentos
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [myBookingsTab, setMyBookingsTab] = useState<'proximos' | 'historico'>('proximos');
  const [bookings, setBookings] = useState<BookingResponse[] | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

  // Slide-over: Agendamentos da Barbearia (para barbeiro/proprietário)
  const [showShopBookings, setShowShopBookings] = useState(false);
  const [selectedShopId, setSelectedShopId] = useState<number | ''>('');
  const [shopBookingsTab, setShopBookingsTab] = useState<'pendentes' | 'confirmados' | 'finalizados'>('pendentes');
  const [shopBookings, setShopBookings] = useState<BookingResponse[] | null>(null);
  const [isLoadingShopBookings, setIsLoadingShopBookings] = useState(false);
  const [shopBookingsError, setShopBookingsError] = useState<string | null>(null);
  const [shopConfirmingId, setShopConfirmingId] = useState<number | null>(null);
  const [shopFinalizingId, setShopFinalizingId] = useState<number | null>(null);
  const [shopCancellingId, setShopCancellingId] = useState<number | null>(null);
  // For role "barbeiro": track my own id_barbeiro to filter shop bookings
  const [myBarberId, setMyBarberId] = useState<number | null>(null);
  // For header avatar when session is barber: fallback to barber entity photo
  // (removido) fallback de avatar do barbeiro via localStorage
  // Hidden finalized bookings (local clear), persisted in localStorage
  const [hiddenFinalizedIds, setHiddenFinalizedIds] = useState<Set<number>>(new Set());
  // Reviews (avaliações)
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewTarget, setReviewTarget] = useState<ReviewTarget>('barbeiro');
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);
  const [evaluatedKeys, setEvaluatedKeys] = useState<Set<string>>(new Set()); // key: `${bookingId}:${target}`
  // Reschedule (reagendamento com aprovação)
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleBookingId, setRescheduleBookingId] = useState<number | null>(null);
  const [rescheduleShopId, setRescheduleShopId] = useState<number | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState<string>('');
  const [rescheduleTime, setRescheduleTime] = useState<string>('');
  const [rescheduleBarberId, setRescheduleBarberId] = useState<number | ''>('');
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);
  const [rescheduleAvailableBarbers, setRescheduleAvailableBarbers] = useState<Barbeiro[] | null>(null);
  const [isLoadingRescheduleBarbers, setIsLoadingRescheduleBarbers] = useState(false);

  // Barbers panel (proprietário)
  const [showBarbers, setShowBarbers] = useState(false);
  const [barbersTab, setBarbersTab] = useState<'gerenciar' | 'cadastrar'>('gerenciar');
  const [barbers, setBarbers] = useState<Barbeiro[] | null>(null);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(false);
  const [barbersError, setBarbersError] = useState<string | null>(null);
  const [togglingBarberId, setTogglingBarberId] = useState<number | null>(null);
  const [createBarberLoading, setCreateBarberLoading] = useState(false);
  const [createBarberError, setCreateBarberError] = useState<string | null>(null);
  const [barberForm, setBarberForm] = useState({ nome: '', email: '', telefone: '', senha: '', confirmarSenha: '', especialidades: [] as string[] });
  const [showPassword, setShowPassword] = useState(false);
  // removed showInactive toggle per request
  const [uploadingUserAvatar, setUploadingUserAvatar] = useState(false);
  
  // Modal states for custom confirmations and success messages
  const [showSuccessBarberModal, setShowSuccessBarberModal] = useState(false);
  const [showDeleteBarberModal, setShowDeleteBarberModal] = useState(false);
  const [barberToDelete, setBarberToDelete] = useState<number | null>(null);
  const [showDeleteServiceModal, setShowDeleteServiceModal] = useState(false);
  const [serviceToDelete, setServiceToDelete] = useState<{ id: number; nome: string } | null>(null);
  const [showConfirmBookingModal, setShowConfirmBookingModal] = useState(false);
  const [showCancelBookingModal, setShowCancelBookingModal] = useState(false);
  const [bookingToCancelShop, setBookingToCancelShop] = useState<number | null>(null);
  const fileInputUserRef = React.useRef<HTMLInputElement | null>(null);
  // Profile modal
  const [showProfileModal, setShowProfileModal] = useState(false);
  const [profileNome, setProfileNome] = useState('');
  const [profileEmail, setProfileEmail] = useState('');
  const [profileTelefone, setProfileTelefone] = useState('');
  const [isUpdatingProfile, setIsUpdatingProfile] = useState(false);
  const [showServices, setShowServices] = useState(false);
  const [servicesTab, setServicesTab] = useState<'gerenciar' | 'cadastrar'>('gerenciar');
  const [services, setServices] = useState<ServiceItem[] | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  const [deletingServiceId, setDeletingServiceId] = useState<number | null>(null);
  const [creatingService, setCreatingService] = useState(false);
  const [createServiceError, setCreateServiceError] = useState<string | null>(null);
  const [serviceForm, setServiceForm] = useState<{ nome: string; preco: string; descricao: string }>({ nome: '', preco: '', descricao: '' });
  // Barbershop profile modal
  const [showBarbershopModal, setShowBarbershopModal] = useState(false);
  const [bsNome, setBsNome] = useState('');
  const [bsEndereco, setBsEndereco] = useState('');
  const [bsTelefone, setBsTelefone] = useState('');
  const [bsHorario, setBsHorario] = useState('');
  const [isUpdatingBarbershop, setIsUpdatingBarbershop] = useState(false);
  // Helpers: phone formatting/validation (Brasil)
  const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');
  const formatPhoneBR = (s: string) => {
    const d = onlyDigits(s).slice(0, 11);
    if (d.length <= 2) return d;
    if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
    if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
    return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
  };
  const emailRegex = /^([^\s@]+)@([^\s@]+)\.[^\s@]+$/;
  // Header actions menu
  const [headerMenuOpen, setHeaderMenuOpen] = useState(false);
  const headerMenuRef = React.useRef<HTMLDivElement | null>(null);
  useEffect(() => {
    if (!headerMenuOpen) return;
    const onDocClick = (e: MouseEvent) => {
      const target = e.target as Node | null;
      if (headerMenuRef.current && target && !headerMenuRef.current.contains(target)) {
        setHeaderMenuOpen(false);
      }
    };
    document.addEventListener('mousedown', onDocClick);
    return () => document.removeEventListener('mousedown', onDocClick);
  }, [headerMenuOpen]);
  // Close on Escape
  useEffect(() => {
    if (!headerMenuOpen) return;
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setHeaderMenuOpen(false);
    };
    document.addEventListener('keydown', onKey);
    return () => document.removeEventListener('keydown', onKey);
  }, [headerMenuOpen]);
  const openUserFilePicker = () => fileInputUserRef.current?.click();
  const openProfileModal = () => {
    if (!user) return;
    setProfileNome(user.nome || '');
    setProfileEmail(user.email || '');
    // telefone pode não existir no User, mantemos vazio
  const currentPhone = (user as any)?.telefone ?? (user as any)?.phone ?? '';
  setProfileTelefone(currentPhone ? formatPhoneBR(currentPhone) : '');
    setShowProfileModal(true);
  };
  const openBarbershopModal = async () => {
    // Garantir que temos uma barbearia selecionada
    let shopId = selectedShopId ? Number(selectedShopId) : undefined;
    if (!shopId) {
      try {
        let data: Barbearia[] = [];
        try { data = await barbershopService.listMine(); } catch { data = await barbershopService.list(); }
        setBarbershops(data);
        if (data[0]) {
          shopId = data[0].id_barbearia;
          setSelectedShopId(shopId);
        }
      } catch {}
    }
    if (!shopId) {
      showError('Nenhuma barbearia encontrada para editar.');
      return;
    }
    const shop = barbershops.find(b => b.id_barbearia === shopId);
    if (shop) {
      setBsNome(shop.nome || '');
      setBsEndereco(shop.endereco || '');
      setBsTelefone(shop.telefone_contato || '');
      setBsHorario(shop.horario_funcionamento || '');
    }
    setShowBarbershopModal(true);
  };
  const handleSaveBarbershop = async () => {
    if (!selectedShopId) { warning('Nenhuma barbearia selecionada.'); return; }
    const nome = bsNome.trim();
    if (nome.length < 2) { warning('Informe um nome válido para a barbearia.'); return; }
    setIsUpdatingBarbershop(true);
    try {
      const telDigits = onlyDigits(bsTelefone);
      const updated = await barbershopService.update(Number(selectedShopId), {
        nome,
        endereco: bsEndereco.trim(),
        telefone_contato: telDigits || undefined,
        horario_funcionamento: bsHorario.trim(),
      });
      // Atualiza lista local de barbearias
      setBarbershops(prev => (prev || []).map(b => b.id_barbearia === updated.id_barbearia ? updated : b));
      setShowBarbershopModal(false);
      success('Dados da barbearia atualizados.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar barbearia.';
      showError(msg);
    } finally {
      setIsUpdatingBarbershop(false);
    }
  };
  const handleSaveProfile = async () => {
    if (!user) return;
    const nome = profileNome.trim();
    const email = profileEmail.trim();
    if (nome.length < 2) { warning('Informe um nome válido.'); return; }
    if (!emailRegex.test(email)) { warning('Informe um email válido.'); return; }
    setIsUpdatingProfile(true);
    try {
      const telDigits = onlyDigits(profileTelefone);
      const updated = await userService.updateMe({ nome, email, telefone: telDigits || undefined });
      // Atualiza sessão local
      if (token) {
        // preserva avatar_url atual caso backend não retorne
        const merged = { ...user, ...updated, avatar_url: updated.avatar_url ?? user.avatar_url } as User;
        login(token, merged);
      }
      setShowProfileModal(false);
      success('Dados atualizados.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar dados.';
      alert(msg);
    } finally {
      setIsUpdatingProfile(false);
    }
  };
  const handleUserAvatarSelected = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !user) return;
    try {
      setUploadingUserAvatar(true);
      if (user.tipo_usuario === 'barbeiro') {
        // Resolve id_barbeiro do usuário logado
        let id_barbeiro: number | null = null;
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
              const me = (list || []).find((b: any) => b?.id_usuario === user.id_usuario);
              if (me?.id_barbeiro) {
                id_barbeiro = Number(me.id_barbeiro);
                break;
              }
            } catch {
              // tenta próxima barbearia
            }
          }
        } catch {
          // ignore, veremos adiante
        }

        if (!id_barbeiro) {
          showError('Não foi possível identificar seu cadastro de barbeiro para atualizar a foto.');
          return;
        }

        const res = await uploadService.uploadBarberAvatar(id_barbeiro, file);
        const newUrl = res.avatar_url;
        // Atualiza também o avatar do usuário no backend para persistir entre logins
        try { await uploadService.uploadUserAvatar(file); } catch {}
        // Atualiza sessão do usuário para refletir a foto imediatamente
        if (token) {
          const updated: User = { ...user, avatar_url: newUrl };
          login(token, updated);
        }
        setBarbers((prev) => {
          if (!prev) return prev;
          return prev.map((b: any) => (Number(b?.id_barbeiro) === Number(id_barbeiro) ? { ...b, avatar_url: newUrl } : b)) as any;
        });
        setBookings((prev) => {
          if (!prev) return prev;
          return prev.map((bk) => (
            bk?.barbeiro?.id_barbeiro && Number(bk.barbeiro.id_barbeiro) === Number(id_barbeiro)
              ? { ...bk, barbeiro: { ...bk.barbeiro, avatar_url: newUrl } }
              : bk
          ));
        });
        setShopBookings((prev) => {
          if (!prev) return prev;
          return prev.map((bk) => (
            bk?.barbeiro?.id_barbeiro && Number(bk.barbeiro.id_barbeiro) === Number(id_barbeiro)
              ? { ...bk, barbeiro: { ...bk.barbeiro, avatar_url: newUrl } }
              : bk
          ));
        });
        success('Foto atualizada.');
      } else {
        // Cliente (ou outros tipos suportados): atualiza avatar do usuário
        const res = await uploadService.uploadUserAvatar(file);
        const newUrl = res.avatar_url;
        if (token) {
          const updated: User = { ...user, avatar_url: newUrl };
          login(token, updated);
        }
        // Atualiza listas que exibem cliente, se aplicável
        setShopBookings((prev) => {
          if (!prev) return prev;
          return prev.map((bk) => (
            bk?.cliente?.id_usuario && Number(bk.cliente.id_usuario) === Number(user.id_usuario)
              ? { ...bk, cliente: { ...bk.cliente, avatar_url: newUrl } }
              : bk
          ));
        });
        success('Foto atualizada.');
      }
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Falha ao enviar foto.');
    } finally {
      setUploadingUserAvatar(false);
      if (fileInputUserRef.current) fileInputUserRef.current.value = '';
    }
  };

  const loadBookings = async () => {
    if (isLoadingBookings) return;
    setIsLoadingBookings(true);
    setBookingsError(null);
    try {
      const list = await bookingService.listMine();
      setBookings(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos.';
      setBookingsError(msg);
    } finally {
      setIsLoadingBookings(false);
    }
  };

  // Função mantida para uso futuro
  // @ts-ignore - função será utilizada posteriormente
  const handleOpenMyBookings = async (tab: 'proximos' | 'historico') => {
    setMyBookingsTab(tab);
    setShowMyBookings(true);
    if (!bookings) await loadBookings();
    // Ensure barbershops are available to resolve names in the list
    if (barbershops.length === 0 && !isLoadingBarbershops) {
      setIsLoadingBarbershops(true);
      try {
        const data = await barbershopService.list();
        setBarbershops(data);
      } catch (err) {
        // noop: we'll just not show the name if it fails
      } finally {
        setIsLoadingBarbershops(false);
      }
    }
  };

  const openCancelBookingModal = (id: number) => {
    setBookingToCancelShop(id);
    setShowCancelBookingModal(true);
  };

  const executeCancelBooking = async () => {
    if (!bookingToCancelShop) return;
    setShowCancelBookingModal(false);
    setCancellingId(bookingToCancelShop);
    try {
      await bookingService.cancel(bookingToCancelShop);
      await loadBookings();
      success('Agendamento cancelado com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao cancelar agendamento.';
      showError(msg);
    } finally {
      setCancellingId(null);
      setBookingToCancelShop(null);
    }
  };

  const loadShopBookings = async (barbeariaId: number) => {
    setIsLoadingShopBookings(true);
    setShopBookingsError(null);
    try {
      const list = await bookingService.listByBarbershop(barbeariaId);
      setShopBookings(list);
    } catch (err: any) {
      const fallback = user?.tipo_usuario === 'barbeiro' ? 'Erro ao carregar agendamentos do barbeiro.' : 'Erro ao carregar agendamentos da barbearia.';
      const msg = err?.response?.data?.message || err?.message || fallback;
      setShopBookingsError(msg);
    } finally {
      setIsLoadingShopBookings(false);
    }
  };

  const handleOpenShopBookings = async () => {
    setShowShopBookings(true);
    setMyBarberId(null);
    // Carregar barbearias do usuário e abrir direto na primeira disponível
    setIsLoadingBarbershops(true);
    setBarbershopError(null);
    try {
      let data: Barbearia[] = [];
      try {
        data = await barbershopService.listMine();
      } catch {
        data = await barbershopService.list();
      }
      setBarbershops(data);
      const first = data[0];
      if (first) {
        setSelectedShopId(first.id_barbearia);
        // Load barbershop reviews summary
        try {
          const r = await evaluationService.listByBarbershop(first.id_barbearia);
          setShopReviews(r);
        } catch {}
  // If logged as barber, resolve my id_barbeiro in this shop to filter
        if (user?.tipo_usuario === 'barbeiro') {
          try {
            const list = await barberService.listByBarbershop(first.id_barbearia, { onlyActive: false });
            const me = (list || []).find((bb: any) => bb?.id_usuario === user.id_usuario);
            setMyBarberId(me?.id_barbeiro ?? null);
            setMyBarberReviews(null);
            if (me?.id_barbeiro) {
              try {
                const rv = await evaluationService.listByBarber(me.id_barbeiro);
                setMyBarberReviews({ average: rv?.average ?? null, total: rv?.total ?? 0 });
              } catch {
                setMyBarberReviews(null);
              }
            }
          } catch (e) {
            // ignore; fallback will show empty if id not found
            setMyBarberId(null);
            setMyBarberReviews(null);
          }
        }
        await loadShopBookings(first.id_barbearia);
        try { await loadRescheduleRequests(first.id_barbearia); } catch {}
      } else {
        setSelectedShopId('');
        setShopBookings([]);
      }
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar barbearias.';
      setBarbershopError(msg);
    } finally {
      setIsLoadingBarbershops(false);
    }
  };

  // Resolve barber avatar for header when session is a barber and user avatar is missing
  useEffect(() => {
    const resolveBarberAvatar = async () => {
      if (!user || user.tipo_usuario !== 'barbeiro') {
        
        return;
      }
      // If user already has avatar_url, prefer it
      if (user.avatar_url) {
        
        return;
      }
      // Sem fallback local: confiamos no backend para retornar avatar_url do usuário/barbeiro
      try {
        let shops: Barbearia[] = [];
        try {
          shops = await barbershopService.listMine();
        } catch {
          // fallback if endpoint not available/authorized
          shops = await barbershopService.list();
        }
        for (const s of shops) {
          try {
            const list = await barberService.listByBarbershop(s.id_barbearia, { onlyActive: false });
            const me = (list || []).find((b: any) => b?.id_usuario === user.id_usuario);
            if (me?.avatar_url) {
              // Nada a fazer; o header usa user.avatar_url
              return;
            }
          } catch {
            // ignore and try next shop
          }
        }
        
      } catch {
        
      }
    };
    resolveBarberAvatar();
  }, [user?.tipo_usuario, user?.avatar_url, user?.id_usuario]);

  const handleShopConfirm = async (id: number) => {
    setShopConfirmingId(id);
    try {
      await bookingService.confirm(id);
      if (selectedShopId) await loadShopBookings(Number(selectedShopId));
      setShowConfirmBookingModal(true);
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Erro ao confirmar.');
    } finally {
      setShopConfirmingId(null);
    }
  };

  // Reviews summary for current selected shop
  const [shopReviews, setShopReviews] = useState<{ average: number | null; total: number; items?: any[] } | null>(null);
  // Reviews summary per barber (id_barbeiro -> {average,total})
  const [barberReviewsMap, setBarberReviewsMap] = useState<Record<number, { average: number | null; total: number }>>({});
  // Reviews summary for logged barber (when session is barber)
  const [myBarberReviews, setMyBarberReviews] = useState<{ average: number | null; total: number } | null>(null);
  useEffect(() => {
    const load = async () => {
      if (!selectedShopId) return;
      try {
        const r = await evaluationService.listByBarbershop(Number(selectedShopId));
        setShopReviews(r);
      } catch {
        setShopReviews(null);
      }
    };
    load();
  }, [selectedShopId]);

  // When barbers list loads, fetch individual review summaries per barber
  useEffect(() => {
    const fetchBarberReviews = async () => {
      if (!barbers || barbers.length === 0) return;
      const ids = Array.from(new Set(
        (barbers || [])
          .map((b: any) => Number((b as any).id_barbeiro))
          .filter((id) => Number.isFinite(id) && id > 0)
      ));
      if (ids.length === 0) return;
      try {
        const results = await Promise.allSettled(ids.map((id) => evaluationService.listByBarber(id)));
        const next: Record<number, { average: number | null; total: number }> = {};
        results.forEach((res, idx) => {
          const id = ids[idx];
          if (res.status === 'fulfilled' && res.value) {
            next[id] = { average: res.value.average ?? null, total: res.value.total ?? 0 };
          }
        });
        setBarberReviewsMap((prev) => ({ ...prev, ...next }));
      } catch {
        // silencioso; UI continua sem estrelas individuais
      }
    };
    fetchBarberReviews();
  }, [barbers]);

  // Also fetch reviews for barbers shown in booking availability
  useEffect(() => {
    const fetchAvailableBarberReviews = async () => {
      if (!availableBarbers || availableBarbers.length === 0) return;
      const idsAll = Array.from(new Set(
        (availableBarbers || [])
          .map((b: any) => Number((b as any).id_barbeiro))
          .filter((id) => Number.isFinite(id) && id > 0)
      ));
      const idsToFetch = idsAll.filter((id) => !(id in barberReviewsMap));
      if (idsToFetch.length === 0) return;
      try {
        const results = await Promise.allSettled(idsToFetch.map((id) => evaluationService.listByBarber(id)));
        const next: Record<number, { average: number | null; total: number }> = {};
        results.forEach((res, idx) => {
          const id = idsToFetch[idx];
          if (res.status === 'fulfilled' && res.value) {
            next[id] = { average: res.value.average ?? null, total: res.value.total ?? 0 };
          }
        });
        if (Object.keys(next).length > 0) {
          setBarberReviewsMap((prev) => ({ ...prev, ...next }));
        }
      } catch {
        // ignore
      }
    };
    fetchAvailableBarberReviews();
  }, [availableBarbers, barberReviewsMap]);

  // Load reschedule requests when shop changes
  const [rescheduleRequests, setRescheduleRequests] = useState<any[] | null>(null);
  const [isLoadingRescheduleRequests, setIsLoadingRescheduleRequests] = useState(false);
  const [rescheduleActionId, setRescheduleActionId] = useState<number | null>(null);
  const loadRescheduleRequests = async (barbeariaId: number) => {
    setIsLoadingRescheduleRequests(true);
    try {
      const list = await rescheduleService.listByBarbershop(barbeariaId);
      setRescheduleRequests(list || []);
    } catch {
      setRescheduleRequests([]);
    } finally {
      setIsLoadingRescheduleRequests(false);
    }
  };
  useEffect(() => {
    if (!selectedShopId) return;
    loadRescheduleRequests(Number(selectedShopId));
  }, [selectedShopId]);

  const handleShopFinalize = async (id: number) => {
    setShopFinalizingId(id);
    try {
      await bookingService.finalize(id);
      if (selectedShopId) await loadShopBookings(Number(selectedShopId));
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Erro ao finalizar.');
    } finally {
      setShopFinalizingId(null);
    }
  };

  const handleShopCancel = async (id: number) => {
    setBookingToCancelShop(id);
    setShowCancelBookingModal(true);
  };

  const executeShopCancel = async () => {
    if (!bookingToCancelShop) return;
    setShowCancelBookingModal(false);
    setShopCancellingId(bookingToCancelShop);
    try {
      await bookingService.cancel(bookingToCancelShop);
      if (selectedShopId) await loadShopBookings(Number(selectedShopId));
      success('Agendamento cancelado com sucesso!');
    } catch (err: any) {
      showError(err?.response?.data?.message || err?.message || 'Erro ao cancelar.');
    } finally {
      setShopCancellingId(null);
      setBookingToCancelShop(null);
    }
  };

  const handleApproveReschedule = async (requestId: number) => {
    setRescheduleActionId(requestId);
    try {
      await rescheduleService.approve(requestId);
      if (selectedShopId) {
        await loadShopBookings(Number(selectedShopId));
        await loadRescheduleRequests(Number(selectedShopId));
      }
      success('Pedido aprovado.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao aprovar pedido.';
      showError(msg);
    } finally {
      setRescheduleActionId(null);
    }
  };

  const handleRejectReschedule = async (requestId: number) => {
    setRescheduleActionId(requestId);
    try {
      await rescheduleService.reject(requestId);
      if (selectedShopId) {
        await loadShopBookings(Number(selectedShopId));
        await loadRescheduleRequests(Number(selectedShopId));
      }
      success('Pedido rejeitado.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao rejeitar pedido.';
      alert(msg);
    } finally {
      setRescheduleActionId(null);
    }
  };

  // Open reschedule modal for a booking (client side)
  const openRescheduleModal = (b: BookingResponse) => {
    setRescheduleBookingId(b.id);
    // Try to infer shop id like helper above
    const aliasId = (b.id_barbearia ?? (b as any)?.barbearia_id ?? (b as any)?.idBarbearia ?? (b as any)?.barbershop_id ?? b.barbearia?.id_barbearia);
    setRescheduleShopId(aliasId ? Number(aliasId) : null);
    setRescheduleDate(b.date || '');
    setRescheduleTime(b.time || '');
    const bid = (b as any).barber_id ?? b.barbeiro?.id_barbeiro;
    setRescheduleBarberId(bid ? Number(bid) : '');
    setShowRescheduleModal(true);
    // Load available barbers for this shop (optional)
    if (aliasId) void loadRescheduleBarbers(Number(aliasId));
  };

  const loadRescheduleBarbers = async (barbeariaId: number) => {
    setIsLoadingRescheduleBarbers(true);
    setRescheduleAvailableBarbers(null);
    try {
      const list = await barberService.listByBarbershop(barbeariaId, { onlyActive: true });
      setRescheduleAvailableBarbers(list || []);
    } catch {
      setRescheduleAvailableBarbers([]);
    } finally {
      setIsLoadingRescheduleBarbers(false);
    }
  };

  const handleSubmitReschedule = async () => {
    if (!rescheduleBookingId) return;
    if (!rescheduleDate || !rescheduleTime) {
      warning('Informe data e hora desejadas.');
      return;
    }
    // Optional: block past date/time
    const dt = new Date(`${rescheduleDate}T${rescheduleTime}:00`);
    if (isFinite(dt.getTime()) && dt < new Date()) {
      warning('Escolha um horário futuro.');
      return;
    }
    setIsSubmittingReschedule(true);
    try {
      const payload: any = { date: rescheduleDate, time: rescheduleTime };
      if (rescheduleBarberId !== '') payload.barber_id = Number(rescheduleBarberId);
      await rescheduleService.create(rescheduleBookingId, payload);
      setShowRescheduleModal(false);
      success('Pedido de reagendamento enviado para aprovação.');
    } catch (err: any) {
      const status = err?.response?.status;
      const serverMsg = err?.response?.data?.message;
      const msg = serverMsg || err?.message || 'Falha ao solicitar reagendamento.';
      if (status === 409) showError('Já existe um pedido pendente para este agendamento.');
      else if (status === 400) showError(msg);
      else if (status === 403) showError(msg || 'Você não pode reagendar este agendamento.');
      else if (status === 404) showError(serverMsg || 'Recurso de reagendamento não encontrado ou agendamento inexistente. Confirme o caminho da API e o ID.');
      else showError(msg);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  // Persist hidden finalized bookings in localStorage (per user) and rehydrate on user change
  const getHiddenKey = () => {
    const uid = (user && (user as any).id_usuario) ? String((user as any).id_usuario) : null;
    return uid ? `hidden_finalized_booking_ids_u_${uid}` : 'hidden_finalized_booking_ids';
  };
  useEffect(() => {
    try {
      const key = getHiddenKey();
      let saved = localStorage.getItem(key);
      // Migrate from legacy key if present and user-specific empty
      if (!saved) {
        const legacy = localStorage.getItem('hidden_finalized_booking_ids');
        if (legacy) {
          localStorage.setItem(key, legacy);
          saved = legacy;
        }
      }
      if (saved) {
        const arr: number[] = JSON.parse(saved);
        if (Array.isArray(arr)) setHiddenFinalizedIds(new Set(arr.map(Number)));
        else setHiddenFinalizedIds(new Set());
      } else {
        setHiddenFinalizedIds(new Set());
      }
    } catch {
      setHiddenFinalizedIds(new Set());
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [user?.id_usuario]);

  useEffect(() => {
    try {
      const key = getHiddenKey();
      const payload = JSON.stringify(Array.from(hiddenFinalizedIds));
      localStorage.setItem(key, payload);
      // Also write legacy key for backward compatibility with older sessions
      localStorage.setItem('hidden_finalized_booking_ids', payload);
    } catch {}
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [hiddenFinalizedIds, user?.id_usuario]);

  // Persist evaluated reviews locally (best-effort UX; backend is source of truth)
  useEffect(() => {
    try {
      const raw = localStorage.getItem('evaluated_reviews');
      if (raw) {
        const arr: string[] = JSON.parse(raw);
        if (Array.isArray(arr)) setEvaluatedKeys(new Set(arr));
      }
    } catch {}
  }, []);
  useEffect(() => {
    try {
      localStorage.setItem('evaluated_reviews', JSON.stringify(Array.from(evaluatedKeys)));
    } catch {}
  }, [evaluatedKeys]);

  const openReviewModal = (bookingId: number) => {
    setReviewBookingId(bookingId);
    setReviewTarget('barbeiro');
    setReviewRating(0);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const handleSubmitReview = async () => {
    if (!reviewBookingId) return;
    if (reviewRating < 1 || reviewRating > 5) {
      warning('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    const comentario = reviewComment.trim();
    if (comentario.length > 1000) {
      warning('Comentário muito longo (máx. 1000 caracteres).');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await evaluationService.create({ id_booking: reviewBookingId, target: reviewTarget, rating: reviewRating, comentario });
      // Mark as evaluated for the chosen target
      setEvaluatedKeys(prev => new Set([...Array.from(prev), `${reviewBookingId}:${reviewTarget}`]));
      setShowReviewModal(false);
      success('Avaliação enviada. Obrigado!');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar avaliação.';
      if (status === 409) {
        // Já existe avaliação para esse booking/target — trata amigável e marca localmente
        setEvaluatedKeys(prev => new Set([...Array.from(prev), `${reviewBookingId}:${reviewTarget}`]));
        setShowReviewModal(false);
        info('Você já avaliou este destino para este agendamento.');
      } else if (status === 400) {
        warning('Agendamento ainda não finalizado. Tente novamente quando estiver finalizado.');
      } else if (status === 403) {
        showError('Você não pode avaliar este agendamento.');
      } else if (status === 404) {
        showError('Agendamento não encontrado para avaliação.');
      } else {
        showError(msg);
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleClearFinalizedMine = async () => {
    try {
      await clearFinalizadosGlobal();
      // Limpeza local não é mais necessária; servidor aplica o filtro
      setHiddenFinalizedIds(new Set());
      await loadBookings();
    } catch (e: any) {
      alert(e?.message || 'Falha ao aplicar limpeza de finalizados.');
    }
  };
  const handleClearFinalizedShop = async () => {
    try {
      if (user?.tipo_usuario === 'barbeiro' && myBarberId) {
        await clearFinalizadosBarbeiro(Number(myBarberId));
      } else if (selectedShopId) {
        await clearFinalizadosBarbearia(Number(selectedShopId));
      } else {
        return;
      }
      setHiddenFinalizedIds(new Set());
      if (selectedShopId) await loadShopBookings(Number(selectedShopId));
    } catch (e: any) {
      showError(e?.message || 'Falha ao aplicar limpeza de finalizados.');
    }
  };

  // Load barbers for selected barbershop when entering booking step 2
  useEffect(() => {
    const loadForBooking = async () => {
      if (bookingStep !== 2 || !selectedBarbershopId) return;
      setIsLoadingAvailableBarbers(true);
      setAvailableBarbersError(null);
      setAvailableBarbers(null);
      // reset selected barber and service for safety when switching shop/step
      setBooking((prev) => ({ ...prev, barber_id: '', service: [] }));
      // load services for booking (from barbearia)
      setIsLoadingBookingServices(true);
      setBookingServicesError(null);
      setBookingServices(null);
      try {
        const [barbersList, servicesList] = await Promise.all([
          barberService.listByBarbershop(Number(selectedBarbershopId), { onlyActive: true }),
          serviceService.listByBarbershop(Number(selectedBarbershopId)),
        ]);
        setAvailableBarbers(barbersList || []);
        setBookingServices((servicesList || []).filter((s) => s.ativo !== false));
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar barbeiros da barbearia.';
        setAvailableBarbersError(msg);
        // Tenta carregar serviços separadamente para pelo menos exibir algo
        try {
          const servicesList = await serviceService.listByBarbershop(Number(selectedBarbershopId));
          setBookingServices((servicesList || []).filter((s) => s.ativo !== false));
        } catch (e: any) {
          const smsg = e?.response?.data?.message || e?.message || 'Erro ao carregar serviços da barbearia.';
          setBookingServicesError(smsg);
        }
      } finally {
        setIsLoadingAvailableBarbers(false);
        setIsLoadingBookingServices(false);
      }
      // Load barbershop config (duration) as a hint; best-effort
      try {
        const cfg = await getBarbeariaConfig(Number(selectedBarbershopId));
        setBookingDurationMinutes(cfg?.duration_minutes ?? null);
      } catch {
        setBookingDurationMinutes(null);
      }
    };
    loadForBooking();
  }, [bookingStep, selectedBarbershopId]);

  // When the first selected service changes in step 2, refetch barbers filtered by that service (UX optimization)
  useEffect(() => {
    const refetchBarbersByFirstService = async () => {
      if (bookingStep !== 2 || !selectedBarbershopId) return;
      const first = booking.service[0];
      if (!first) return;
      try {
        setIsLoadingAvailableBarbers(true);
        setAvailableBarbersError(null);
        const list = await barberService.listByBarbershop(Number(selectedBarbershopId), { onlyActive: true, service: first });
        setAvailableBarbers(list || []);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar barbeiros.';
        setAvailableBarbersError(msg);
      } finally {
        setIsLoadingAvailableBarbers(false);
      }
    };
    refetchBarbersByFirstService();
  }, [bookingStep, selectedBarbershopId, booking.service.length > 0 ? booking.service[0] : '']);

  // Onboarding check: run when user is proprietario
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
          const bh = (cfgRes.value.business_hours || []);
          missingHours = bh.every((d: any) => !d.open || !d.close);
        }
        let missingBarbers = true;
        if (barbersRes.status === 'fulfilled') {
          missingBarbers = Array.isArray(barbersRes.value) ? barbersRes.value.length === 0 : true;
        }
        let missingServices = true;
        if (servicesRes.status === 'fulfilled') {
          missingServices = Array.isArray(servicesRes.value) ? servicesRes.value.length === 0 : true;
        }
        if (mounted) setOnboarding({ missingHours, missingBarbers, missingServices, barbershopId: shopId });
      } catch (err) {
        // ignore
      }
    };
    runOnboardingCheck();
    return () => { mounted = false; };
  }, [user]);

  // Helper: manter compatibilidade para filtros de serviços (ver também barberHasAllServices)

  // Helper: barber offers all selected services (AND logic, case-insensitive)
  const barberHasAllServices = (b: Barbeiro, servicesNames: string[]): boolean => {
    if (!servicesNames || servicesNames.length === 0) return false;
    const specs = new Set(
      (b.especialidades || '')
        .split(',')
        .map((s) => s.trim().toLowerCase())
        .filter(Boolean)
    );
    return servicesNames
      .map((n) => n.trim().toLowerCase())
      .filter(Boolean)
      .every((n) => specs.has(n));
  };

  // Barbers panel helpers
  const loadBarbers = async (barbeariaId: number, opts?: { onlyActive?: boolean }) => {
    setIsLoadingBarbers(true);
    setBarbersError(null);
    try {
  const list = await barberService.listByBarbershop(barbeariaId, { onlyActive: opts?.onlyActive ?? true });
      setBarbers(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar barbeiros.';
      setBarbersError(msg);
    } finally {
      setIsLoadingBarbers(false);
    }
  };

  const handleOpenBarbersPanel = async () => {
    setShowBarbers(true);
    setBarbersTab('gerenciar');
    setBarbers(null);
    // carregar barbearias e selecionar a primeira
    setIsLoadingBarbershops(true);
    setBarbershopError(null);
    try {
      let data: Barbearia[] = [];
      try {
        data = await barbershopService.listMine();
      } catch {
        data = await barbershopService.list();
      }
      setBarbershops(data);
      const first = data[0];
        if (first) {
        setSelectedShopId(first.id_barbearia);
        await Promise.all([
          loadBarbers(first.id_barbearia),
          loadServices(first.id_barbearia),
        ]);
      } else {
        setSelectedShopId('');
        setBarbers([]);
      }
    } catch (err: any) {
      setBarbershopError(err?.response?.data?.message || err?.message || 'Erro ao carregar barbearias.');
    } finally {
      setIsLoadingBarbershops(false);
    }
  };

  // Ao abrir o painel de barbeiros e trocar para a aba "cadastrar", garanta serviços carregados
  useEffect(() => {
    if (showBarbers && barbersTab === 'cadastrar' && selectedShopId) {
      loadServices(Number(selectedShopId));
    }
  }, [showBarbers, barbersTab, selectedShopId]);

  // Services helpers
  const loadServices = async (barbeariaId: number) => {
    setIsLoadingServices(true);
    setServicesError(null);
    try {
      const list = await serviceService.listByBarbershop(barbeariaId);
      setServices(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar serviços.';
      setServicesError(msg);
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleCreateService = async (e: React.FormEvent) => {
    e.preventDefault();
    if (creatingService) return;
    if (!selectedShopId) {
      alert('Nenhuma barbearia selecionada.');
      return;
    }
    const nome = serviceForm.nome.trim();
    const preco = serviceForm.preco.trim();
    if (nome.length < 2) {
      warning('Informe um nome válido para o serviço (mínimo 2 caracteres).');
      return;
    }
    if (!preco) {
      warning('Informe um preço (apenas visual).');
      return;
    }
    setCreatingService(true);
    setCreateServiceError(null);
    try {
      await serviceService.create(Number(selectedShopId), {
        nome,
        preco,
        descricao: serviceForm.descricao.trim() || undefined,
      });
      setServiceForm({ nome: '', preco: '', descricao: '' });
      setServicesTab('gerenciar');
      await loadServices(Number(selectedShopId));
      success('Serviço cadastrado com sucesso.');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao cadastrar serviço.';
      setCreateServiceError(msg);
    } finally {
      setCreatingService(false);
    }
  };

  const handleToggleBarber = async (id_barbeiro: number, nextAtivo: boolean) => {
    if (user?.tipo_usuario !== 'proprietario') {
      warning('Apenas o proprietário pode alterar o status de barbeiros.');
      return;
    }
    if (!barbers) return;
    // optimistic update
    setTogglingBarberId(id_barbeiro);
    const prev = barbers.slice();
    const idx = prev.findIndex((b: any) => (b?.id_barbeiro) === id_barbeiro);
    if (idx === -1) {
      setTogglingBarberId(null);
      showError('Barbeiro não encontrado na lista.');
      return;
    }
    const next = prev.map((b: any) => (
      (b?.id_barbeiro) === id_barbeiro ? { ...b, ativo: nextAtivo } : b
    ));
    setBarbers(next as any);
    try {
      await barberService.setActive(id_barbeiro, nextAtivo);
      // sucesso: manter estado otimista
      success('Status atualizado.');
    } catch (err: any) {
      // revert
      setBarbers(prev as any);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar barbeiro.';
      if (status === 401) {
        showError(msg || 'Sessão expirada. Faça login novamente.');
        await logout();
        navigate('/login');
      } else if (status === 403) {
        showError('Acesso negado. Apenas o proprietário pode alterar o status.');
      } else if (status === 404) {
        showError('Barbeiro não encontrado. A lista será recarregada.');
        if (selectedShopId) await loadBarbers(Number(selectedShopId));
      } else if (status === 400) {
        showError(msg || 'Payload inválido.');
      } else {
        showError(msg || 'Erro interno. Tente novamente.');
      }
    } finally {
      setTogglingBarberId(null);
    }
  };

  // Delete (soft-delete) a barber: set ativo = false and remove from the visible list
  const openDeleteBarberModal = (id_barbeiro: number) => {
    if (user?.tipo_usuario !== 'proprietario') {
      warning('Apenas o proprietário pode excluir barbeiros.');
      return;
    }
    setBarberToDelete(id_barbeiro);
    setShowDeleteBarberModal(true);
  };

  const executeDeleteBarber = async () => {
    if (!barberToDelete) return;
    setShowDeleteBarberModal(false);
    setTogglingBarberId(barberToDelete);
    try {
      await barberService.setActive(barberToDelete, false);
      // remove from list so UI doesn't immediately show an "Ativar" button
      setBarbers((prev) => (prev || []).filter((b: any) => Number(b?.id_barbeiro) !== Number(barberToDelete)));
      success('Barbeiro excluído com sucesso!');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Erro ao excluir barbeiro.';
      if (status === 401) {
        showError(msg || 'Sessão expirada. Faça login novamente.');
        await logout();
        navigate('/login');
      } else if (status === 403) {
        showError('Acesso negado. Apenas o proprietário pode excluir barbeiros.');
      } else if (status === 404) {
        showError('Barbeiro não encontrado. A lista será recarregada.');
        if (selectedShopId) await loadBarbers(Number(selectedShopId));
      } else {
        showError(msg || 'Erro interno. Tente novamente.');
      }
    } finally {
      setTogglingBarberId(null);
      setBarberToDelete(null);
    }
  };

  // Service deletion handlers
  const openDeleteServiceModal = (serviceId: number, serviceName: string) => {
    if (!selectedShopId) {
      warning('Selecione uma barbearia.');
      return;
    }
    setServiceToDelete({ id: serviceId, nome: serviceName });
    setShowDeleteServiceModal(true);
  };

  const executeDeleteService = async () => {
    if (!serviceToDelete || !selectedShopId) return;
    setShowDeleteServiceModal(false);
    setDeletingServiceId(serviceToDelete.id);
    try {
      await serviceService.delete(Number(selectedShopId), serviceToDelete.id);
      await loadServices(Number(selectedShopId));
      success('Serviço excluído com sucesso!');
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao excluir serviço.';
      showError(msg);
    } finally {
      setDeletingServiceId(null);
      setServiceToDelete(null);
    }
  };

  const handleCreateBarber = async (e: React.FormEvent) => {
    e.preventDefault();
    if (createBarberLoading) return;
    if (!selectedShopId) {
      alert('Nenhuma barbearia selecionada.');
      return;
    }
    setCreateBarberLoading(true);
    setCreateBarberError(null);
    try {
      await barberService.create({
        id_barbearia: Number(selectedShopId),
        nome: barberForm.nome,
        email: barberForm.email,
        telefone: barberForm.telefone.replace(/\D/g, ''),
        senha: barberForm.senha,
        especialidades: (barberForm.especialidades && barberForm.especialidades.length > 0)
          ? barberForm.especialidades.join(', ')
          : undefined,
      });
      setBarberForm({ nome: '', email: '', telefone: '', senha: '', confirmarSenha: '', especialidades: [] });
      setBarbersTab('gerenciar');
      await loadBarbers(Number(selectedShopId));
      setShowSuccessBarberModal(true);
    } catch (err: any) {
      console.error('Erro ao cadastrar barbeiro:', err);
      console.error('Response data:', err?.response?.data);
      const errorMsg = err?.response?.data?.message 
        || err?.response?.data?.error 
        || err?.message 
        || 'Erro ao cadastrar barbeiro.';
      setCreateBarberError(errorMsg);
      showError(errorMsg);
    } finally {
      setCreateBarberLoading(false);
    }
  };

  // (Listagem de agendamentos foi movida para a página Meus Agendamentos)

  const handleBookingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    if (name === 'barber_id') {
      setBooking(prev => ({ ...prev, barber_id: value === '' ? '' : Number(value) }));
    } else if (name === 'notes' || name === 'date' || name === 'time') {
      setBooking(prev => ({ ...prev, [name]: value }));
    } else {
      setBooking(prev => ({ ...prev, [name]: value }));
    }
  };

  // Seleção múltipla de serviços: filtramos barbeiros que atendem a TODOS os selecionados

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    if (!selectedBarbershopId) {
      alert('Selecione uma barbearia para continuar.');
      return;
    }
    // Optional: block past date/time
    const toDate = (d: string, t: string) => new Date(`${d}T${t}:00`);
    const now = new Date();
    if (booking.date && booking.time) {
      const dt = toDate(booking.date, booking.time);
      if (isFinite(dt.getTime()) && dt < now) {
        alert('Não é possível agendar no passado.');
        return;
      }
    }
    if (!booking.service || booking.service.length < 1) {
      alert('Selecione pelo menos um serviço.');
      return;
    }
    if (booking.barber_id === '' || booking.barber_id == null) {
      alert('Selecione um barbeiro.');
      return;
    }
    // Validate against barbershop business hours (prevent booking before opening)
    try {
      if (booking.date && booking.time) {
        // get barbershop config (best-effort)
        const cfg = await getBarbeariaConfig(Number(selectedBarbershopId));
        const dayIndex = new Date(`${booking.date}T00:00`).getDay(); // 0..6
        const bh = cfg?.business_hours?.[dayIndex];
        const startTime = booking.time;
        const duration = bookingDurationMinutes ?? cfg?.duration_minutes ?? 30;
        if (!bh || !bh.open || !bh.close) {
          alert('A barbearia está fechada neste dia. Escolha outra data.');
          setIsSubmitting(false);
          return;
        }
        if (!isValidTimeHHMM(startTime)) {
          alert('Informe horário no formato HH:MM.');
          setIsSubmitting(false);
          return;
        }
        const startMin = timeToMinutes(startTime);
        const openMin = timeToMinutes(bh.open);
        const closeMin = timeToMinutes(bh.close);
        if (startMin < openMin) {
          alert(`Horário inválido: a barbearia abre às ${bh.open}. Escolha um horário a partir de ${bh.open}.`);
          setIsSubmitting(false);
          return;
        }
        if (startMin + duration > closeMin) {
          alert(`Horário inválido: este serviço ultrapassa o horário de fechamento (${bh.close}).`);
          setIsSubmitting(false);
          return;
        }
      }
    } catch (err) {
      // Best-effort: if config lookup fails, allow submit and let backend validate
      console.warn('Não foi possível validar horários com a configuração da barbearia:', err);
    }
    setIsSubmitting(true);
    try {
      const payload: BookingRequest = {
        id_barbearia: Number(selectedBarbershopId),
        // Send array of service names as requested by the backend
        service: booking.service,
        date: booking.date,
        time: booking.time,
        barber_id: Number(booking.barber_id),
        notes: booking.notes || undefined,
      };
      const created = await bookingService.create(payload);
      console.log('Agendamento criado:', created);
      alert('Agendamento criado com sucesso.');
      setShowBooking(false);
      setBooking({ service: [], date: '', time: '', barber_id: '', notes: '' });
      setSelectedBarbershopId('');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Erro ao criar agendamento.';
      console.error('Erro no agendamento:', err);
      if (status === 409) {
        alert('Horário indisponível para este barbeiro. Por favor, escolha outro horário ou barbeiro.');
      } else if (status === 400) {
        // Destacar campos (básico): apenas alerta por enquanto
        const fieldErrors = err?.response?.data?.fieldErrors;
        if (fieldErrors && typeof fieldErrors === 'object') {
          const firstKey = Object.keys(fieldErrors)[0];
          alert(`${msg} ${firstKey ? `Campo: ${firstKey}` : ''}`);
        } else {
          alert(msg);
        }
      } else {
        alert(msg);
      }
    } finally {
      setIsSubmitting(false);
    }
  };

  const handleLogout = async (): Promise<void> => {
    try {
      await logout();
      navigate('/login');
    } catch (error) {
      console.error('Erro ao fazer logout:', error);
    }
  };

  if (!user) {
    return null;
  }

  // Open the barbearia config page for onboarding (tries known id then falls back)
  const openOnboardingConfig = async () => {
    let id = onboarding?.barbershopId as number | undefined | null;
    if (!id) {
      try {
        const mine = await barbershopService.listMine();
        if (mine && mine[0]) id = mine[0].id_barbearia;
      } catch {
        try {
          const all = await barbershopService.list();
          if (all && all[0]) id = all[0].id_barbearia;
        } catch {}
      }
    }
    if (id) navigate(`/barbearias/${id}/config`);
    else alert('Nenhuma barbearia encontrada para configurar.');
  };

  // Helper to display the barbershop name for a booking
  const getBookingBarbershopName = (b: BookingResponse): string | undefined => {
    const aliasId =
      b.id_barbearia ??
      (b as any)?.barbearia_id ??
      (b as any)?.idBarbearia ??
      (b as any)?.barbershop_id ??
      b.barbearia?.id_barbearia;

    return (
      b.barbearia?.nome ||
      b.barbearia_nome ||
      (aliasId ? barbershops.find((s) => s.id_barbearia === Number(aliasId))?.nome : undefined)
    );
  };

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="grid gap-3 grid-cols-2 sm:grid-cols-3 items-center">
              <div className="flex items-center gap-3 order-1">
                {(user.tipo_usuario === 'barbeiro' || user.tipo_usuario === 'cliente') && (
                  <>
                    <div className="h-10 w-10 sm:h-12 sm:w-12 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold select-none overflow-hidden">
                      {user.avatar_url ? (
                        <img src={user.avatar_url} alt={user.nome} className="h-full w-full object-cover" />
                      ) : (
                        (user.nome || 'U')
                          .split(' ')
                          .filter(Boolean)
                          .slice(0, 2)
                          .map((p) => p[0]?.toUpperCase())
                          .join('')
                      )}
                    </div>
                    {(user.tipo_usuario === 'barbeiro' || user.tipo_usuario === 'cliente') && (
                      <div>
                        <button
                          type="button"
                          onClick={openUserFilePicker}
                          disabled={uploadingUserAvatar}
                          className={`inline-flex items-center gap-2 px-2.5 sm:px-3 py-2 rounded-md text-sm font-medium border ${uploadingUserAvatar ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                        >
                          {/* Camera icon */}
                          <svg className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                            <path d="M4 5a2 2 0 00-2 2v7a3 3 0 003 3h10a3 3 0 003-3V7a2 2 0 00-2-2h-2.382a1 1 0 01-.894-.553L11.789 2.447A1 1 0 0010.895 2H9.105a1 1 0 00-.894.447L6.276 4.447A1 1 0 015.382 5H4zm6 3a4 4 0 110 8 4 4 0 010-8z"/>
                          </svg>
                          <span className="hidden sm:inline">{uploadingUserAvatar ? 'Enviando...' : 'Atualizar foto'}</span>
                        </button>
                        <input
                          ref={fileInputUserRef}
                          type="file"
                          accept="image/*"
                          className="hidden"
                          onChange={handleUserAvatarSelected}
                        />
                      </div>
                    )}
                  </>
                )}
              </div>
              <div className="col-span-2 sm:col-span-1 text-center order-3 sm:order-2">
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9">
                  Dashboard - Hasty Barber
                </h1>
                <p className="mt-1 text-sm text-gray-500 truncate max-w-[90vw] sm:max-w-none px-2 sm:px-0 mx-auto">Bem-vindo ao seu painel de controle</p>
              </div>
              <div className="justify-self-end order-2 sm:order-3">
                <div className="flex items-center gap-2">
                  <div className="relative inline-block text-left" ref={headerMenuRef}>
                    <button
                      onClick={() => setHeaderMenuOpen((v) => !v)}
                      className={`${headerMenuOpen ? 'bg-gray-50 ring-2 ring-indigo-500' : 'bg-white'} inline-flex h-9 w-9 items-center justify-center rounded-full border border-gray-200 text-gray-700 shadow-sm hover:bg-gray-50 focus:outline-none focus:ring-2 focus:ring-indigo-500`}
                      title="Ações rápidas"
                      aria-haspopup="menu"
                      aria-expanded={headerMenuOpen}
                      aria-controls="header-actions-menu"
                    >
                      {/* Three bars icon */}
                      <svg className="h-5 w-5 text-gray-700" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                        <path strokeWidth="1.75" strokeLinecap="round" strokeLinejoin="round" d="M3.75 5.25h16.5m-16.5 6h16.5m-16.5 6h16.5" />
                      </svg>
                    </button>
                    {headerMenuOpen && (
                      <div
                        id="header-actions-menu"
                        className="origin-top-right absolute right-0 mt-2 w-56 rounded-xl border border-gray-100 bg-white shadow-lg ring-1 ring-black/5 z-20 overflow-hidden divide-y divide-gray-100"
                        role="menu"
                        aria-label="Ações"
                      >
                        <div className="p-1">
                          <button
                            className="group flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                            role="menuitem"
                            onClick={() => {
                              setHeaderMenuOpen(false);
                              openProfileModal();
                            }}
                          >
                            {/* user icon */}
                            <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15.75 7.5a3.75 3.75 0 11-7.5 0 3.75 3.75 0 017.5 0zM4.5 20.25a8.25 8.25 0 1115 0v.75H4.5v-.75z" />
                            </svg>
                            <span>Meus dados</span>
                          </button>
                          {user.tipo_usuario === 'proprietario' && (
                            <>
                              <button
                                className="group mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                role="menuitem"
                                onClick={() => {
                                  setHeaderMenuOpen(false);
                                  openBarbershopModal();
                                }}
                              >
                                {/* shop/building icon */}
                                <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M3 9.75l9-6 9 6M4.5 10.5v9a1.5 1.5 0 001.5 1.5h12a1.5 1.5 0 001.5-1.5v-9M9 21v-6a3 3 0 016 0v6" />
                                </svg>
                                <span>Dados da barbearia</span>
                              </button>
                              <button
                                className="group mt-1 flex w-full items-center gap-3 rounded-lg px-3 py-2.5 text-sm text-gray-700 hover:bg-indigo-50 hover:text-indigo-700 transition-colors"
                                role="menuitem"
                                onClick={async () => {
                                  setHeaderMenuOpen(false);
                                  let id = selectedShopId ? Number(selectedShopId) : undefined;
                                  if (!id) {
                                    try {
                                      let list: Barbearia[] = [];
                                      try { list = await barbershopService.listMine(); } catch { list = await barbershopService.list(); }
                                      if (list[0]) id = list[0].id_barbearia;
                                    } catch {}
                                  }
                                  if (id) navigate(`/barbearias/${id}/config`);
                                  else alert('Nenhuma barbearia encontrada.');
                                }}
                              >
                                {/* cog icon */}
                                <svg className="h-5 w-5 text-gray-400 group-hover:text-indigo-600" viewBox="0 0 24 24" fill="none" stroke="currentColor" aria-hidden="true">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.89 3.31.877 2.42 2.42a1.724 1.724 0 001.066 2.573c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.89 1.543-.877 3.31-2.42 2.42a1.724 1.724 0 00-2.573 1.066c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.89-3.31-.877-2.42-2.42a1.724 1.724 0 00-1.066-2.573c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.89-1.543.877-3.31 2.42-2.42a1.724 1.724 0 002.573-1.066z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="1.75" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                                </svg>
                                <span>Configurações da barbearia</span>
                              </button>
                            </>
                          )}
                        </div>
                      </div>
                    )}
                  </div>
                  <button
                    onClick={handleLogout}
                    className="inline-flex items-center px-4 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-red-600 hover:bg-red-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500"
                  >
                    Sair
                  </button>
                </div>
              </div>
            </div>
          </div>
        </div>


        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:p-6">
            <h2 className="text-lg font-medium text-gray-900 mb-4">
              Informações do Usuário
            </h2>
            <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
              <div>
                <dt className="text-sm font-medium text-gray-500">Nome</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.nome}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Email</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.email}</dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">Tipo de Usuário</dt>
                <dd className="mt-1">
                  <span className={`inline-flex items-center px-2.5 py-0.5 rounded-full text-xs font-medium ${
                    user.tipo_usuario === 'proprietario' 
                      ? 'bg-green-100 text-green-800' 
                      : user.tipo_usuario === 'barbeiro'
                      ? 'bg-blue-100 text-blue-800'
                      : 'bg-purple-100 text-purple-800'
                  }`}>
                    {user.tipo_usuario}
                  </span>
                </dd>
              </div>
              <div>
                <dt className="text-sm font-medium text-gray-500">ID do Usuário</dt>
                <dd className="mt-1 text-sm text-gray-900">{user.id_usuario}</dd>
              </div>
            </div>
          </div>
        </div>

        {user.tipo_usuario === 'proprietario' && (
          <div className="bg-green-50 border border-green-200 rounded-lg p-4 mb-6">
            <div className="flex">
              <div className="flex-shrink-0">
                <svg className="h-5 w-5 text-green-400" viewBox="0 0 20 20" fill="currentColor">
                  <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.293a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293a1 1 0 00-1.414 1.414l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd" />
                </svg>
              </div>
              <div className="ml-3">
                <h3 className="text-sm font-medium text-green-800">
                  Barbearia cadastrada com sucesso!
                </h3>
                <div className="mt-2 text-sm text-green-700">
                  <p>
                    Sua barbearia foi registrada no sistema. Agora você pode começar a gerenciar 
                    seus serviços, barbeiros e agendamentos.
                  </p>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Onboarding banner: shows when owner has missing setup items */}
        {user.tipo_usuario === 'proprietario' && showOnboardingBanner && (onboarding.missingHours || onboarding.missingBarbers || onboarding.missingServices) && (
          <div className="bg-yellow-50 border border-yellow-200 rounded-lg p-4 mb-6">
            <div className="flex items-start justify-between">
              <div className="flex items-center gap-3">
                <svg className="h-6 w-6 text-yellow-500" viewBox="0 0 20 20" fill="currentColor" aria-hidden="true">
                  <path d="M8.257 3.099c.366-.446.957-.717 1.574-.717s1.208.271 1.574.717l5.516 6.716c.467.57.38 1.435-.187 1.925a1.25 1.25 0 01-1.68-.172L11 9.08V15a1 1 0 11-2 0V9.08L3.007 11.83a1.25 1.25 0 01-1.68.172c-.567-.49-.654-1.355-.187-1.925L8.257 3.1z" />
                </svg>
                <div>
                  <h3 className="text-sm font-medium text-yellow-800">Completar configuração da sua barbearia</h3>
                  <p className="mt-1 text-sm text-yellow-700">
                    Parece que faltam algumas etapas para deixar sua barbearia pronta: {' '}
                    {onboarding.missingHours ? 'horários ' : ''}
                    {onboarding.missingBarbers ? (onboarding.missingHours ? '• barbeiros ' : 'barbeiros ') : ''}
                    {onboarding.missingServices ? ((onboarding.missingHours || onboarding.missingBarbers) ? '• serviços' : 'serviços') : ''}
                    .
                  </p>
                  <div className="mt-3 flex gap-2 flex-wrap">
                    <button
                      type="button"
                      onClick={openOnboardingConfig}
                      className="inline-flex items-center px-3 py-1.5 bg-yellow-600 text-white rounded-md text-sm font-medium hover:bg-yellow-700"
                    >
                      Configurar horários
                    </button>
                    <button
                      type="button"
                      onClick={async () => { setShowBarbers(true); setBarbersTab('cadastrar'); await handleOpenBarbersPanel(); }}
                      className="inline-flex items-center px-3 py-1.5 bg-white text-yellow-800 border border-yellow-200 rounded-md text-sm font-medium hover:bg-yellow-50"
                    >
                      Cadastrar barbeiros
                    </button>
                    <button
                      type="button"
                      onClick={() => { setShowServices(true); setServicesTab('cadastrar'); }}
                      className="inline-flex items-center px-3 py-1.5 bg-white text-yellow-800 border border-yellow-200 rounded-md text-sm font-medium hover:bg-yellow-50"
                    >
                      Cadastrar serviços
                    </button>
                  </div>
                </div>
              </div>
              <div className="ml-4">
                <button
                  type="button"
                  onClick={() => setShowOnboardingBanner(false)}
                  className="inline-flex items-center p-1 rounded-md text-yellow-600 hover:bg-yellow-100"
                  aria-label="Fechar"
                >
                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="none" stroke="currentColor">
                    <path strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" d="M6 6l8 8M6 14L14 6" />
                  </svg>
                </button>
              </div>
            </div>
          </div>
        )}
        <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 gap-6 mb-6">
          {user.tipo_usuario === 'proprietario' && (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17 20h5v-2a3 3 0 00-5.196-2.196M17 20H7m10 0v-2c0-5.523-4.477-10-10-10s-10 4.477-10 10v2m20 0H7m0 0H2v-2a3 3 0 015.196-2.196M7 20v-2m3-14a3 3 0 106 0 3 3 0 00-6 0v4a1 1 0 001 1h4a1 1 0 001-1v-4z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button
                            onClick={async () => {
                              // abrir painel de barbeiros
                              await handleOpenBarbersPanel();
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Gerenciar Barbeiros
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>


              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a3 3 0 01-3 3H6a3 3 0 01-3-3V8a1 1 0 011-1h3z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        {/* título removido conforme solicitação */}
                        <dt className="text-sm font-medium text-gray-500 truncate hidden" />
                        <dd className="text-lg font-medium text-gray-900">
                          <button
                            onClick={async () => {
                              setShowServices(true);
                              setServicesTab('gerenciar');
                              setServices(null);
                              setIsLoadingBarbershops(true);
                              setBarbershopError(null);
                              try {
                                let data: Barbearia[] = [];
                                try { data = await barbershopService.listMine(); } catch { data = await barbershopService.list(); }
                                setBarbershops(data);
                                const first = data[0];
                                if (first) {
                                  setSelectedShopId(first.id_barbearia);
                                  await loadServices(first.id_barbearia);
                                } else {
                                  setSelectedShopId('');
                                  setServices([]);
                                }
                              } catch (err: any) {
                                setBarbershopError(err?.response?.data?.message || err?.message || 'Erro ao carregar barbearias.');
                              } finally {
                                setIsLoadingBarbershops(false);
                              }
                            }}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Gerenciar Serviços
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a3 3 0 01-3 3H6a3 3 0 01-3-3V8a1 1 0 011-1h3z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button
                            onClick={handleOpenShopBookings}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Agendamentos da Barbearia
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {user.tipo_usuario === 'barbeiro' && (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dd className="text-lg font-medium text-gray-900">
                          <button
                            onClick={handleOpenShopBookings}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Agendamentos do Barbeiro
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>
            </>
          )}

          {user.tipo_usuario === 'cliente' && (
            <>
              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3a1 1 0 011-1h6a1 1 0 011 1v4h3a1 1 0 011 1v8a3 3 0 01-3 3H6a3 3 0 01-3-3V8a1 1 0 011-1h3z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dt className="text-sm font-medium text-gray-500 truncate">

                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          <button
                            onClick={() => navigate('/booking')}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Agendar Serviço
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dd className="text-lg font-medium text-gray-900">
                          <button
                            onClick={() => navigate('/my-appointments')}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Meus Agendamentos
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              <div className="bg-white overflow-hidden shadow rounded-lg">
                <div className="p-5">
                  <div className="flex items-center">
                    <div className="flex-shrink-0">
                      <svg className="h-6 w-6 text-indigo-600" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z" />
                      </svg>
                    </div>
                    <div className="ml-5 w-0 flex-1">
                      <dl>
                        <dd className="text-lg font-medium text-gray-900">
                          <button
                            onClick={() => navigate('/appointment-history')}
                            className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                          >
                            Histórico
                          </button>
                        </dd>
                      </dl>
                    </div>
                  </div>
                </div>
              </div>

              
            </>
          )}
        </div>


        <div className="bg-blue-50 border border-blue-200 rounded-lg p-4">
          <div className="flex">
            <div className="flex-shrink-0">
              <svg className="h-5 w-5 text-blue-400" viewBox="0 0 20 20" fill="currentColor">
                <path fillRule="evenodd" d="M18 10a8 8 0 11-16 0 8 8 0 0116 0zm-7-4a1 1 0 11-2 0 1 1 0 012 0zM9 9a1 1 0 000 2v3a1 1 0 001 1h1a1 1 0 100-2v-3a1 1 0 00-1-1H9z" clipRule="evenodd" />
              </svg>
            </div>
            <div className="ml-3">
              <h3 className="text-sm font-medium text-blue-800">
                Funcionalidades em desenvolvimento
              </h3>
              <div className="mt-2 text-sm text-blue-700">
                <p>
                  Estamos trabalhando para trazer mais funcionalidades para o Hasty Barber. 
                  Em breve você terá acesso a agendamentos, gerenciamento de serviços e muito mais!
                </p>
              </div>
            </div>
          </div>
        </div>

        {/* Booking slide-over */}
        {showBooking && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowBooking(false)}
              aria-hidden
            />
            <aside className="ml-auto w-full max-w-md bg-white shadow-xl p-6 overflow-auto z-50">
              {/* Step header */}
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">
                  {bookingStep === 1 ? 'Escolha a Barbearia' : 'Novo Agendamento'}
                </h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowBooking(false);
                      setBookingStep(1);
                      setSelectedBarbershopId('');
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
              </div>

              {bookingStep === 1 ? (
                <div className="space-y-4">
                  {isLoadingBarbershops && (
                    <p className="text-sm text-gray-600">Carregando barbearias...</p>
                  )}
                  {barbershopError && (
                    <p className="text-sm text-red-600">{barbershopError}</p>
                  )}
                  {!isLoadingBarbershops && !barbershopError && (
                    <ul className="divide-y divide-gray-200">
                      {barbershops.length === 0 && (
                        <li className="py-3 text-sm text-gray-600">Nenhuma barbearia encontrada.</li>
                      )}
                      {barbershops.map((b) => (
                        <li key={b.id_barbearia} className="py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium">{b.nome}</p>
                              {b.endereco && (
                                <p className="text-sm text-gray-600">{b.endereco}</p>
                              )}
                              {b.telefone_contato && (
                                <p className="text-sm text-gray-600">{b.telefone_contato}</p>
                              )}
                            </div>
                            <button
                              onClick={() => setSelectedBarbershopId(b.id_barbearia)}
                              className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${selectedBarbershopId === b.id_barbearia ? 'bg-green-600 hover:bg-green-700' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                            >
                              {selectedBarbershopId === b.id_barbearia ? 'Selecionado' : 'Selecionar'}
                            </button>
                          </div>
                        </li>
                      ))}
                    </ul>
                  )}

                  <div className="flex justify-end gap-2 pt-2">
                    <button
                      type="button"
                      onClick={() => setShowBooking(false)}
                      className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="button"
                      onClick={() => setBookingStep(2)}
                      disabled={!selectedBarbershopId}
                      className={`px-4 py-2 rounded-md text-white text-sm ${!selectedBarbershopId ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      Continuar
                    </button>
                  </div>
                </div>
              ) : (
                <form onSubmit={handleBookingSubmit} className="space-y-5">
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Barbearia selecionada:{' '}
                      <span className="font-medium">
                        {barbershops.find((b) => b.id_barbearia === selectedBarbershopId)?.nome || '—'}
                      </span>
                    </p>
                    <button
                      type="button"
                      onClick={() => setBookingStep(1)}
                      className="text-indigo-600 text-sm hover:underline"
                    >
                      Trocar
                    </button>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800">Serviços</label>
                    {isLoadingBookingServices ? (
                      <p className="mt-1 text-sm text-gray-600">Carregando serviços...</p>
                    ) : bookingServicesError ? (
                      <p className="mt-1 text-sm text-red-600">{bookingServicesError}</p>
                    ) : (
                      <div className="mt-2">
                        <div className="mb-2 flex items-center justify-between text-xs text-gray-600">
                          <span>{booking.service.length} selecionado(s)</span>
                          <div className="flex items-center gap-2">
                            <button
                              type="button"
                              onClick={() => setBooking((prev) => ({ ...prev, service: (bookingServices||[]).map(s=>s.nome), barber_id: '' }))}
                              className="underline hover:text-gray-800"
                            >Selecionar todos</button>
                            <span className="text-gray-300">|</span>
                            <button
                              type="button"
                              onClick={() => setBooking((prev) => ({ ...prev, service: [], barber_id: '' }))}
                              className="underline hover:text-gray-800"
                            >Limpar</button>
                          </div>
                        </div>
                        <div className="grid grid-cols-1 sm:grid-cols-2 gap-2">
                        {(bookingServices || []).map((s) => {
                          const checked = booking.service.includes(s.nome);
                          return (
                            <label key={s.id} className={`cursor-pointer inline-flex items-center gap-2 text-sm rounded-full px-3 py-2 border ${checked ? 'bg-indigo-50 border-indigo-300 text-indigo-900' : 'bg-white border-gray-200 text-gray-700'} transition-colors`}>
                              <input
                                type="checkbox"
                                className="sr-only"
                                checked={checked}
                                onChange={() => {
                                  setBooking((prev) => {
                                    const exists = prev.service.includes(s.nome);
                                    const nextServices = exists
                                      ? prev.service.filter((n) => n !== s.nome)
                                      : [...prev.service, s.nome];
                                    return { ...prev, service: nextServices, barber_id: '' };
                                  });
                                }}
                              />
                              <span className="flex-1 flex items-center justify-between gap-3">
                                <span className="font-medium">{s.nome}</span>
                                {s.preco ? <span className="text-gray-500 text-xs">R$ {s.preco}</span> : null}
                              </span>
                            </label>
                          );
                        })}
                        </div>
                      </div>
                    )}
                    {bookingServices && bookingServices.length === 0 && !bookingServicesError && !isLoadingBookingServices && (
                      <p className="mt-1 text-xs text-gray-500">Nenhum serviço cadastrado para esta barbearia.</p>
                    )}
                    {!isLoadingBookingServices && !bookingServicesError && bookingServices && bookingServices.length > 0 && (
                      <p className="mt-1 text-xs text-gray-500">Selecione um ou mais serviços. Mostraremos apenas barbeiros que realizam todos os selecionados.</p>
                    )}
                  </div>

                  <div className="rounded-lg border border-gray-200 p-3 bg-gray-50/30">
                    <div className="grid grid-cols-1 sm:grid-cols-2 gap-3">
                      <div>
                        <label className="block text-sm font-medium text-gray-800">Data</label>
                        <div className="relative mt-1">
                          <svg className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 000 2h8a1 1 0 100-2H6zM3 7a2 2 0 012-2h10a2 2 0 012 2v8a3 3 0 01-3 3H6a3 3 0 01-3-3V7z"/></svg>
                          <input
                            type="date"
                            name="date"
                            value={booking.date}
                            onChange={handleBookingChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm pl-9 pr-3 py-2"
                            required
                          />
                        </div>
                      </div>
                      <div>
                        <label className="block text-sm font-medium text-gray-800">Hora</label>
                        <div className="relative mt-1">
                          <svg className="h-4 w-4 text-gray-400 absolute left-3 top-1/2 -translate-y-1/2 pointer-events-none" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8V5a1 1 0 10-2 0v6a1 1 0 00.293.707l3 3a1 1 0 101.414-1.414L11 10z"/></svg>
                          <input
                            type="time"
                            name="time"
                            value={booking.time}
                            onChange={handleBookingChange}
                            className="block w-full rounded-md border-gray-300 shadow-sm pl-9 pr-3 py-2"
                            required
                          />
                        </div>
                        <p className="mt-1 text-xs text-gray-500">Cada agendamento ocupa {bookingDurationMinutes ?? 30} minutos.</p>
                      </div>
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800">Barbeiro</label>
                    {isLoadingAvailableBarbers ? (
                      <p className="mt-1 text-sm text-gray-600">Carregando barbeiros...</p>
                    ) : availableBarbersError ? (
                      <p className="mt-1 text-sm text-red-600">{availableBarbersError}</p>
                    ) : (
                      (() => {
                        const selectedServices = booking.service;
                        const filtered = selectedServices.length > 0
                          ? (availableBarbers || []).filter((b) => barberHasAllServices(b, selectedServices))
                          : [];
                        return (
                          <>
                            <div className="mb-2 text-xs text-gray-600">{filtered.length} barbeiro(s) encontrado(s)</div>
                            {/* Card radios for barber selection */}
                            <div
                              role="radiogroup"
                              aria-label="Barbeiros disponíveis"
                              className="mt-1 grid grid-cols-1 gap-2"
                            >
                              {filtered.map((b) => {
                                const id = Number((b as any).id_barbeiro);
                                const selected = booking.barber_id !== '' && Number(booking.barber_id) === id;
                                const rev = Number.isFinite(id) ? barberReviewsMap[id] : undefined;
                                return (
                                  <div
                                    key={`card-${id}`}
                                    role="radio"
                                    aria-checked={selected}
                                    tabIndex={0}
                                    onClick={() => setBooking((prev) => ({ ...prev, barber_id: id }))}
                                    onKeyDown={(e) => {
                                      if (e.key === 'Enter' || e.key === ' ') {
                                        e.preventDefault();
                                        setBooking((prev) => ({ ...prev, barber_id: id }));
                                      }
                                    }}
                                    className={`flex items-center justify-between gap-3 p-3 rounded-md border transition-colors cursor-pointer ${selected ? 'border-indigo-500 bg-indigo-50' : 'border-gray-200 bg-white hover:bg-gray-50'}`}
                                  >
                                    <div className="flex items-center gap-2">
                                      <div className="h-8 w-8 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-medium select-none overflow-hidden">
                                        {(b as any).avatar_url ? (
                                          <img src={(b as any).avatar_url} alt={b.nome} className="h-full w-full object-cover" />
                                        ) : (
                                          (() => {
                                            const name = (b.nome || '').trim();
                                            const initials = name ? name.split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('') : 'BB';
                                            return initials;
                                          })()
                                        )}
                                      </div>
                                      <div>
                                        <div className="text-sm font-medium text-gray-900">{b.nome}</div>
                                        {b.especialidades && <div className="text-xs text-gray-600">{String(b.especialidades)}</div>}
                                      </div>
                                    </div>
                                    <div className="flex items-center gap-1 text-xs text-gray-600">
                                      <div className="inline-flex items-center">
                                        {[1,2,3,4,5].map(n => (
                                          <svg key={n} className={`h-3 w-3 ${((rev?.average||0) >= n - 0.5) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z"/></svg>
                                        ))}
                                      </div>
                                      {rev && <span className="tabular-nums">{rev.average ? rev.average.toFixed(1) : '—'} ({rev.total})</span>}
                                    </div>
                                  </div>
                                );
                              })}
                            </div>
                            {selectedServices.length === 0 && (
                              <p className="mt-1 text-xs text-gray-500">Selecione um ou mais serviços para ver os barbeiros compatíveis.</p>
                            )}
                            {selectedServices.length > 0 && filtered.length === 0 && !availableBarbersError && !isLoadingAvailableBarbers && (
                              <p className="mt-1 text-xs text-gray-500">Nenhum barbeiro realiza todos os serviços selecionados.</p>
                            )}
                            {/* Suggestions list removed: cards above are now the selection UI */}
                          </>
                        );
                      })()
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-800">Observações</label>
                    <textarea
                      name="notes"
                      value={booking.notes}
                      onChange={handleBookingChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      rows={3}
                    />
                    <div className="mt-1 text-xs text-gray-500 text-right">{(booking.notes||'').length}/500</div>
                  </div>

                  <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2">
                    <div className="text-xs text-gray-600">
                      <span className="font-medium">Resumo:</span>{' '}
                      <span>{booking.service.length} serviço(s)</span>
                      {booking.barber_id ? ' • 1 barbeiro selecionado' : ''}
                      {(booking.date && booking.time) ? ` • ${booking.date} às ${booking.time}` : ''}
                    </div>
                    <div className="flex justify-end space-x-2">
                    <button
                      type="button"
                      onClick={() => setShowBooking(false)}
                      className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm"
                    >
                      Cancelar
                    </button>
                    <button
                      type="submit"
                      disabled={isSubmitting}
                      className={`px-4 py-2 rounded-md text-white text-sm ${isSubmitting ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                    >
                      {isSubmitting ? 'Enviando...' : 'Confirmar'}
                    </button>
                    </div>
                  </div>
                </form>
              )}
            </aside>
          </div>
        )}

        {/* My Bookings slide-over */}
        {showMyBookings && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowMyBookings(false)}
              aria-hidden
            />
            <aside className="ml-auto w-full max-w-md bg-white shadow-xl p-6 overflow-auto z-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Meus Agendamentos</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => setShowMyBookings(false)}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="mb-4 flex items-center gap-2">
                <div className="inline-flex rounded-md shadow-sm border border-gray-200 overflow-hidden" role="tablist" aria-label="Meus agendamentos - abas">
                  <button
                    onClick={() => setMyBookingsTab('proximos')}
                    className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium ${myBookingsTab === 'proximos' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    aria-pressed={myBookingsTab === 'proximos'} role="tab" aria-selected={myBookingsTab === 'proximos'}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 000 2h8a1 1 0 100-2H6zM3 7a2 2 0 012-2h10a2 2 0 012 2v8a3 3 0 01-3 3H6a3 3 0 01-3-3V7z"/></svg>
                    <span className="hidden sm:inline">Próximos</span>
                  </button>
                  <button
                    onClick={() => setMyBookingsTab('historico')}
                    className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 text-xs sm:text-sm font-medium border-l ${myBookingsTab === 'historico' ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}
                    aria-pressed={myBookingsTab === 'historico'} role="tab" aria-selected={myBookingsTab === 'historico'}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor">
                      <path d="M3 6h14v2H3zM3 10h14v2H3zM3 14h14v2H3z" />
                    </svg>
                    <span className="hidden sm:inline">Histórico</span>
                  </button>
                </div>
                {/* Botão de limpar finalizados movido para o rodapé da lista */}
                <div className="ml-auto flex items-center gap-2">
                  <button
                    onClick={loadBookings}
                    disabled={isLoadingBookings}
                    title="Atualizar lista"
                    aria-label="Atualizar lista"
                    className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium border ${isLoadingBookings ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 10a7 7 0 1111.95 4.95l1.6 1.6a1 1 0 11-1.414 1.415l-1.6-1.6A7 7 0 013 10zm7-5a5 5 0 100 10 5 5 0 000-10z"/></svg>
                    <span className="hidden sm:inline">{isLoadingBookings ? 'Atualizando...' : 'Atualizar'}</span>
                  </button>
                </div>
              </div>

              <div>
                {isLoadingBookings && (
                  <div className="space-y-3">
                    {[1,2,3].map((i) => (
                      <div key={i} className="py-3">
                        <div className="animate-pulse flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                          </div>
                          <div className="h-8 w-24 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {bookingsError && <p className="text-red-600">{bookingsError}</p>}
                {!isLoadingBookings && !bookingsError && (
                  <ul className="divide-y divide-gray-200">
                    {(() => {
                      const now = new Date();
                      const toDate = (b: BookingResponse) => new Date(`${b.date}T${b.time}:00`);
                      let items = (bookings || []).filter((b) => {
                        const isPast = toDate(b) < now;
                        if (myBookingsTab === 'proximos') {
                          return (b.status === 'pendente' || b.status === 'confirmado') && !isPast;
                        }
                        // Histórico: somente agendamentos finalizados
                        return b.status === 'finalizado';
                      }).sort((a, b) => {
                        return myBookingsTab === 'proximos' ? (+toDate(a) - +toDate(b)) : (+toDate(b) - +toDate(a));
                      });

                      // Ocultar finalizados limpos localmente
                      if (myBookingsTab === 'historico') {
                        items = items.filter((b) => !hiddenFinalizedIds.has(b.id));
                      }

                      if (items.length === 0) {
                        return (
                          <li className="py-3">
                            {myBookingsTab === 'proximos' ? 'Nenhum agendamento futuro.' : 'Nenhum agendamento realizado anteriormente.'}
                          </li>
                        );
                      }

                      return (
                        <>
                        {items.map((b) => (
                        <li key={b.id} className="py-3">
                          <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                            <div className="flex items-start justify-between gap-4">
                              <div className="flex-1 space-y-1">
                                {/* Status badge - primeiro elemento */}
                                {myBookingsTab === 'historico' && (
                                  <div className="mb-2">
                                    <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 capitalize font-medium ${
                                      b.status === 'cancelado' ? 'bg-red-100 text-red-800 border border-red-200' : 
                                      b.status === 'finalizado' ? 'bg-green-100 text-green-800 border border-green-200' : 
                                      'bg-gray-100 text-gray-800 border border-gray-200'
                                    }`}>
                                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        {b.status === 'cancelado' && <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>}
                                        {b.status === 'finalizado' && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293A1 1 0 006.293 10.707l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>}
                                      </svg>
                                      {b.status}
                                    </span>
                                  </div>
                                )}
                                <div className="flex items-center gap-2 flex-wrap">
                                  <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-medium select-none overflow-hidden">
                                    {b.barbeiro?.avatar_url ? (
                                      <img src={b.barbeiro.avatar_url} alt={b.barbeiro?.nome || 'Barbeiro'} className="h-full w-full object-cover" />
                                    ) : (
                                      (() => {
                                        const name = (b.barbeiro?.nome || '').trim();
                                        const initials = name ? name.split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('') : 'BB';
                                        return initials;
                                      })()
                                    )}
                                  </div>
                                  <span className="font-semibold capitalize text-gray-900">{b.service}</span>
                                  {myBookingsTab === 'proximos' && (
                                    <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 capitalize ${
                                      b.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                                      b.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                                      'bg-gray-100 text-gray-800'
                                    }`}>
                                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        {b.status === 'pendente' && <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8V6a1 1 0 10-2 0v5a1 1 0 00.293.707l3 3a1 1 0 101.414-1.414L11 10z"/>}
                                        {b.status === 'confirmado' && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293A1 1 0 006.293 10.707l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>}
                                      </svg>
                                      {b.status}
                                    </span>
                                  )}
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                  <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 000 2h8a1 1 0 100-2H6zM4 7a2 2 0 012-2h8a2 2 0 012 2v7a3 3 0 01-3 3H7a3 3 0 01-3-3V7z"/></svg>
                                  <span>{b.date} às {b.time}</span>
                                </div>
                                <div className="text-sm text-gray-600 flex items-center gap-2">
                                  <span>Barbeiro: {b.barbeiro?.nome || '—'}{b.barbeiro?.telefone ? ` • ${b.barbeiro?.telefone}` : ''}</span>
                                </div>
                                {(() => {
                                  const name = getBookingBarbershopName(b);
                                  const phone = b.barbearia?.telefone_contato;
                                  return name ? (
                                    <div className="text-sm text-gray-600 flex items-center gap-2">
                                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 7a2 2 0 012-2h10a2 2 0 012 2v8a3 3 0 01-3 3H6a3 3 0 01-3-3V7zM6 3a1 1 0 000 2h8a1 1 0 100-2H6z"/></svg>
                                      <span>Barbearia: {name}{phone ? ` • ${phone}` : ''}</span>
                                    </div>
                                  ) : null;
                                })()}
                                {b.notes && <p className="text-sm text-gray-500 mt-1">{b.notes}</p>}
                              </div>
                              <div className="flex flex-col items-end gap-2">
                                {myBookingsTab === 'proximos' && (
                                  <div className="flex flex-col gap-2">
                                    <button
                                      onClick={() => openCancelBookingModal(b.id)}
                                      disabled={cancellingId === b.id}
                                      className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border ${cancellingId === b.id ? 'bg-white text-red-300 border-red-200 cursor-not-allowed' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                                      {cancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
                                    </button>
                                    <button
                                      onClick={() => openRescheduleModal(b)}
                                      className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border bg-white text-indigo-700 border-indigo-300 hover:bg-indigo-50"
                                      title="Solicitar reagendamento"
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8V5a1 1 0 10-2 0v6a1 1 0 00.293.707l3 3a1 1 0 101.414-1.414L11 10z"/></svg>
                                      Reagendar
                                    </button>
                                  </div>
                                )}
                                {myBookingsTab === 'historico' && (
                                  (() => {
                                    const keyBarber = `${b.id}:barbeiro`;
                                    const keyShop = `${b.id}:barbearia`;
                                    const bothEvaluated = evaluatedKeys.has(keyBarber) && evaluatedKeys.has(keyShop);
                                    if (bothEvaluated) return null;
                                    return (
                                      <button
                                        onClick={() => openReviewModal(b.id)}
                                        className="inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border bg-white text-gray-700 border-gray-300 hover:bg-gray-50"
                                        title="Avaliar atendimento"
                                      >
                                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z"/></svg>
                                        Avaliar
                                      </button>
                                    );
                                  })()
                                )}
                              </div>
                            </div>
                          </div>
                        </li>
                        ))}
                        {myBookingsTab === 'historico' && items.length > 0 && (
                          <li key="clear-finalizados" className="pt-2">
                            <button
                              onClick={handleClearFinalizedMine}
                              title="Limpar agendamentos finalizados"
                              aria-label="Limpar agendamentos finalizados"
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path d="M6 6a1 1 0 011-1h6a1 1 0 011 1v9a2 2 0 01-2 2H8a2 2 0 01-2-2V6zM8 4a2 2 0 012-2h0a2 2 0 012 2h3a1 1 0 010 2H5a1 1 0 110-2h3z"/></svg>
                              <span>Limpar finalizados</span>
                            </button>
                          </li>
                        )}
                        </>
                      );
                    })()}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Review Modal */}
        {showReviewModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowReviewModal(false)} aria-hidden />
            <div className="relative z-50 w-full max-w-md bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Avaliar atendimento</h3>
                <button onClick={() => setShowReviewModal(false)} className="text-gray-500 hover:text-gray-700" aria-label="Fechar">✕</button>
              </div>
              <div className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Destino</label>
                  <div className="inline-flex rounded-md border border-gray-200 overflow-hidden">
                    {(['barbeiro','barbearia'] as const).map(t => (
                      <button key={t} onClick={() => setReviewTarget(t)} className={`px-3 py-2 text-sm ${reviewTarget===t ? 'bg-indigo-600 text-white' : 'bg-white text-gray-700 hover:bg-gray-50'}`}>{t.charAt(0).toUpperCase()+t.slice(1)}</button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Nota</label>
                  <div className="flex items-center gap-1">
                    {[1,2,3,4,5].map(n => (
                      <button key={n} type="button" onClick={() => setReviewRating(n)} aria-label={`${n} estrela(s)`} className="p-1">
                        <svg className={`h-6 w-6 ${reviewRating>=n ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z"/></svg>
                      </button>
                    ))}
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700 mb-1">Comentário (opcional)</label>
                  <textarea value={reviewComment} onChange={(e)=>setReviewComment(e.target.value)} maxLength={1000} rows={4} className="w-full border border-gray-300 rounded-md p-2 text-sm" placeholder="Conte brevemente sua experiência (máx. 1000 caracteres)" />
                  <div className="text-xs text-gray-500 mt-1">{reviewComment.length}/1000</div>
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowReviewModal(false)} className="px-3 py-2 rounded-md text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleSubmitReview} disabled={isSubmittingReview} className={`px-3 py-2 rounded-md text-sm text-white ${isSubmittingReview?'bg-indigo-400 cursor-not-allowed':'bg-indigo-600 hover:bg-indigo-700'}`}>{isSubmittingReview ? 'Enviando...' : 'Enviar'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Profile Modal */}
        {showProfileModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowProfileModal(false)} aria-hidden />
            <div className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Atualizar meus dados</h3>
                <button onClick={() => setShowProfileModal(false)} className="text-gray-500 hover:text-gray-700" aria-label="Fechar">✕</button>
              </div>
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Nome</label>
                  <div className="mt-1 relative">
                    <input
                      type="text"
                      value={profileNome}
                      onChange={(e)=>setProfileNome(e.target.value)}
                      className="block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                      placeholder="Seu nome completo"
                    />
                  </div>
                  {profileNome.trim().length > 0 && profileNome.trim().length < 2 && (
                    <p className="mt-1 text-xs text-red-600">Informe ao menos 2 caracteres.</p>
                  )}
                </div>

                {/* Email */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Email</label>
                  <input
                    type="email"
                    value={profileEmail}
                    onChange={(e)=>setProfileEmail(e.target.value)}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${profileEmail && !emailRegex.test(profileEmail.trim()) ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="seuemail@exemplo.com"
                  />
                  {profileEmail && !emailRegex.test(profileEmail.trim()) && (
                    <p className="mt-1 text-xs text-red-600">Email inválido.</p>
                  )}
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Telefone (opcional)</label>
                  <input
                    type="tel"
                    value={formatPhoneBR(profileTelefone)}
                    onChange={(e)=>setProfileTelefone(formatPhoneBR(e.target.value))}
                    inputMode="numeric"
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${profileTelefone && (onlyDigits(profileTelefone).length < 10 || onlyDigits(profileTelefone).length > 11) ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="(11) 98888-7777"
                  />
                  {profileTelefone && (onlyDigits(profileTelefone).length < 10 || onlyDigits(profileTelefone).length > 11) && (
                    <p className="mt-1 text-xs text-red-600">Informe um telefone com DDD (10 ou 11 dígitos).</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => setShowProfileModal(false)} className="px-3 py-2 rounded-md text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={handleSaveProfile}
                    disabled={isUpdatingProfile || profileNome.trim().length < 2 || !emailRegex.test(profileEmail.trim()) || (Boolean(profileTelefone) && (onlyDigits(profileTelefone).length < 10 || onlyDigits(profileTelefone).length > 11))}
                    className={`px-3 py-2 rounded-md text-sm text-white ${isUpdatingProfile || profileNome.trim().length < 2 || !emailRegex.test(profileEmail.trim()) || (Boolean(profileTelefone) && (onlyDigits(profileTelefone).length < 10 || onlyDigits(profileTelefone).length > 11)) ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {isUpdatingProfile ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Barbershop Profile Modal */}
        {showBarbershopModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowBarbershopModal(false)} aria-hidden />
            <div className="relative z-50 w-full max-w-md bg-white rounded-2xl shadow-xl p-6 border border-gray-100">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-semibold text-gray-900">Editar dados da barbearia</h3>
                <button onClick={() => setShowBarbershopModal(false)} className="text-gray-500 hover:text-gray-700" aria-label="Fechar">✕</button>
              </div>
              <div className="space-y-4">
                {/* Nome */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Nome</label>
                  <input
                    type="text"
                    value={bsNome}
                    onChange={(e)=>setBsNome(e.target.value)}
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${bsNome.trim().length > 0 && bsNome.trim().length < 2 ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="Nome da barbearia"
                  />
                  {bsNome.trim().length > 0 && bsNome.trim().length < 2 && (
                    <p className="mt-1 text-xs text-red-600">Informe ao menos 2 caracteres.</p>
                  )}
                </div>

                {/* Endereço */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Endereço (opcional)</label>
                  <input
                    type="text"
                    value={bsEndereco}
                    onChange={(e)=>setBsEndereco(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Rua Exemplo, 123 - Bairro, Cidade"
                  />
                </div>

                {/* Telefone */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Telefone (opcional)</label>
                  <input
                    type="tel"
                    value={formatPhoneBR(bsTelefone)}
                    onChange={(e)=>setBsTelefone(formatPhoneBR(e.target.value))}
                    inputMode="numeric"
                    className={`mt-1 block w-full rounded-lg border px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500 ${(bsTelefone && (onlyDigits(bsTelefone).length < 10 || onlyDigits(bsTelefone).length > 11)) ? 'border-red-300' : 'border-gray-300'}`}
                    placeholder="(11) 4002-8922"
                  />
                  {bsTelefone && (onlyDigits(bsTelefone).length < 10 || onlyDigits(bsTelefone).length > 11) && (
                    <p className="mt-1 text-xs text-red-600">Informe um telefone com DDD (10 ou 11 dígitos).</p>
                  )}
                </div>

                {/* Horário */}
                <div>
                  <label className="block text-xs font-medium text-gray-600">Horário de funcionamento (opcional)</label>
                  <input
                    type="text"
                    value={bsHorario}
                    onChange={(e)=>setBsHorario(e.target.value)}
                    className="mt-1 block w-full rounded-lg border border-gray-300 px-3 py-2 text-sm shadow-sm focus:border-indigo-500 focus:ring-2 focus:ring-indigo-500"
                    placeholder="Ex.: Seg a Sex 9h-18h; Sáb 9h-14h"
                  />
                  {bsHorario && bsHorario.length > 80 && (
                    <p className="mt-1 text-xs text-red-600">Texto muito longo. Seja sucinto (até 80 caracteres).</p>
                  )}
                </div>

                <div className="flex items-center justify-end gap-2 pt-2">
                  <button onClick={() => setShowBarbershopModal(false)} className="px-3 py-2 rounded-md text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50">Cancelar</button>
                  <button
                    onClick={handleSaveBarbershop}
                    disabled={isUpdatingBarbershop || bsNome.trim().length < 2 || (Boolean(bsTelefone) && (onlyDigits(bsTelefone).length < 10 || onlyDigits(bsTelefone).length > 11)) || (Boolean(bsHorario) && bsHorario.length > 80)}
                    className={`px-3 py-2 rounded-md text-sm text-white ${isUpdatingBarbershop || bsNome.trim().length < 2 || (Boolean(bsTelefone) && (onlyDigits(bsTelefone).length < 10 || onlyDigits(bsTelefone).length > 11)) || (Boolean(bsHorario) && bsHorario.length > 80) ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                  >
                    {isUpdatingBarbershop ? 'Salvando...' : 'Salvar'}
                  </button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Reschedule Modal */}
        {showRescheduleModal && (
          <div className="fixed inset-0 z-50 flex items-center justify-center">
            <div className="fixed inset-0 bg-black/40" onClick={() => setShowRescheduleModal(false)} aria-hidden />
            <div className="relative z-50 w-full max-w-md bg-white rounded-lg shadow-lg p-6">
              <div className="flex items-center justify-between mb-3">
                <h3 className="text-lg font-medium text-gray-900">Solicitar reagendamento</h3>
                <button onClick={() => setShowRescheduleModal(false)} className="text-gray-500 hover:text-gray-700" aria-label="Fechar">✕</button>
              </div>
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-2">
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nova data</label>
                    <input type="date" value={rescheduleDate} onChange={(e)=>setRescheduleDate(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-700">Nova hora</label>
                    <input type="time" value={rescheduleTime} onChange={(e)=>setRescheduleTime(e.target.value)} className="mt-1 block w-full rounded-md border-gray-300 shadow-sm" />
                  </div>
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-700">Barbeiro (opcional)</label>
                  {isLoadingRescheduleBarbers ? (
                    <p className="mt-1 text-sm text-gray-600">Carregando barbeiros...</p>
                  ) : (
                    <select
                      value={rescheduleBarberId as any}
                      onChange={(e)=> setRescheduleBarberId(e.target.value === '' ? '' : Number(e.target.value))}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white"
                      disabled={!rescheduleShopId || !rescheduleAvailableBarbers || rescheduleAvailableBarbers.length === 0}
                    >
                      <option value="">— Manter barbeiro atual —</option>
                      {(rescheduleAvailableBarbers || []).map((b) => (
                        <option key={(b as any).id_barbeiro ?? b.id_usuario} value={(b as any).id_barbeiro ?? ''}>
                          {b.nome}{b.telefone ? ` • ${b.telefone}` : ''}{b.especialidades ? ` — ${b.especialidades}` : ''}
                        </option>
                      ))}
                    </select>
                  )}
                  {!isLoadingRescheduleBarbers && rescheduleAvailableBarbers && rescheduleAvailableBarbers.length === 0 && (
                    <p className="mt-1 text-xs text-gray-500">Nenhum barbeiro ativo disponível nesta barbearia.</p>
                  )}
                </div>
                <div className="text-xs text-gray-500">
                  Seu pedido será enviado para aprovação. Você receberá a confirmação quando o barbeiro aprovar.
                </div>
                <div className="flex items-center justify-end gap-2">
                  <button onClick={() => setShowRescheduleModal(false)} className="px-3 py-2 rounded-md text-sm border bg-white text-gray-700 border-gray-300 hover:bg-gray-50">Cancelar</button>
                  <button onClick={handleSubmitReschedule} disabled={isSubmittingReschedule} className={`px-3 py-2 rounded-md text-sm text-white ${isSubmittingReschedule ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}>{isSubmittingReschedule ? 'Enviando...' : 'Enviar pedido'}</button>
                </div>
              </div>
            </div>
          </div>
        )}

        {/* Shop Bookings slide-over */}
        {showShopBookings && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowShopBookings(false)}
              aria-hidden
            />
            <aside className="ml-auto w-full max-w-md bg-white shadow-xl p-6 overflow-auto z-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">{user?.tipo_usuario === 'barbeiro' ? 'Agendamentos do Barbeiro' : 'Agendamentos da Barbearia'}</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowShopBookings(false);
                      setSelectedShopId('');
                      setShopBookings(null);
                      setMyBarberReviews(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
              </div>
              <div className="space-y-4">
                {user.tipo_usuario !== 'barbeiro' && (
                  <div className="flex items-center justify-between">
                    <p className="text-sm text-gray-700">
                      Barbearia:{' '}
                      <span className="font-medium">
                        {barbershops.find((b) => b.id_barbearia === selectedShopId)?.nome || '—'}
                      </span>
                    </p>
                    <div />
                  </div>
                )}
                {user?.tipo_usuario === 'barbeiro'
                  ? (
                    myBarberReviews && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="inline-flex items-center" aria-label="Avaliação do barbeiro">
                          {[1,2,3,4,5].map(n => (
                            <svg key={n} className={`h-4 w-4 ${((myBarberReviews.average||0) >= n - 0.5) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z"/></svg>
                          ))}
                        </div>
                        <span className="tabular-nums">{myBarberReviews.average ? myBarberReviews.average.toFixed(1) : '—'}</span>
                        <span className="text-gray-500">({myBarberReviews.total})</span>
                      </div>
                    )
                  )
                  : (
                    selectedShopId && shopReviews && (
                      <div className="flex items-center gap-2 text-sm text-gray-700">
                        <div className="inline-flex items-center" aria-label="Avaliação da barbearia">
                          {[1,2,3,4,5].map(n => (
                            <svg key={n} className={`h-4 w-4 ${((shopReviews.average||0) >= n - 0.5) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z"/></svg>
                          ))}
                        </div>
                        <span className="tabular-nums">{shopReviews.average ? shopReviews.average.toFixed(1) : '—'}</span>
                        <span className="text-gray-500">({shopReviews.total})</span>
                      </div>
                    )
                  )
                }

                {/* Pending reschedule requests */}
                {selectedShopId && (
                  <div className="border border-indigo-100 rounded-md p-3 bg-indigo-50/30">
                    <div className="flex items-center justify-between mb-2">
                      <div className="flex items-center gap-2 text-sm font-medium text-indigo-800">
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8V5a1 1 0 10-2 0v6a1 1 0 00.293.707l3 3a1 1 0 101.414-1.414L11 10z"/></svg>
                        Pedidos de reagendamento
                      </div>
                      <button
                        onClick={() => selectedShopId && loadRescheduleRequests(Number(selectedShopId))}
                        disabled={isLoadingRescheduleRequests}
                        className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium border ${isLoadingRescheduleRequests ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 10a7 7 0 1111.95 4.95l1.6 1.6a1 1 0 11-1.414 1.415l-1.6-1.6A7 7 0 013 10zm7-5a5 5 0 100 10 5 5 0 000-10z"/></svg>
                        {isLoadingRescheduleRequests ? 'Atualizando...' : 'Atualizar'}
                      </button>
                    </div>
                    {isLoadingRescheduleRequests ? (
                      <p className="text-xs text-gray-600">Carregando pedidos...</p>
                    ) : (!rescheduleRequests || rescheduleRequests.length === 0) ? (
                      <p className="text-xs text-gray-600">Nenhum pedido pendente.</p>
                    ) : (
                      <ul className="space-y-2">
                        {(rescheduleRequests || []).filter((r:any)=>r.status==='pendente').map((r:any)=> (
                          <li key={r.id} className="bg-white border border-gray-200 rounded p-2">
                            <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-2">
                              <div className="text-xs text-gray-700">
                                <div><span className="font-medium">Agendamento:</span> #{r.booking_id}</div>
                                <div><span className="font-medium">Para:</span> {r.target_date} às {r.target_time}{r.target_barber_id ? ` • Barbeiro #${r.target_barber_id}` : ''}</div>
                              </div>
                              <div className="flex gap-2 flex-wrap justify-end">
                                <button
                                  onClick={() => handleRejectReschedule(r.id)}
                                  disabled={rescheduleActionId === r.id}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white ${rescheduleActionId === r.id ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                                >
                                  Rejeitar
                                </button>
                                <button
                                  onClick={() => handleApproveReschedule(r.id)}
                                  disabled={rescheduleActionId === r.id}
                                  className={`inline-flex items-center gap-1 px-2 py-1 rounded-md text-xs font-medium text-white ${rescheduleActionId === r.id ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'}`}
                                >
                                  Aprovar
                                </button>
                              </div>
                            </div>
                          </li>
                        ))}
                      </ul>
                    )}
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap" role="tablist" aria-label={user?.tipo_usuario === 'barbeiro' ? 'Agendamentos do barbeiro - abas' : 'Agendamentos da barbearia - abas'}>
                    {(['pendentes','confirmados','finalizados'] as const).map(tab => (
                      <button
                        key={tab}
                        onClick={() => setShopBookingsTab(tab)}
                        role="tab"
                        aria-selected={shopBookingsTab === tab}
                        className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium border transition-colors duration-200 ${shopBookingsTab === tab ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        <svg className="h-3.5 w-3.5 sm:h-4 sm:w-4" viewBox="0 0 20 20" fill="currentColor">
                          {tab === 'pendentes' && <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8V6a1 1 0 10-2 0v5a1 1 0 00.293.707l3 3a1 1 0 101.414-1.414L11 10z"/>}
                          {tab === 'confirmados' && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293A1 1 0 006.293 10.707l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>}
                          {tab === 'finalizados' && <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>}
                        </svg>
                        <span className="hidden sm:inline">{tab.charAt(0).toUpperCase() + tab.slice(1)}</span>
                      </button>
                    ))}
                    {/* Botão de limpar finalizados movido para o rodapé da lista */}
                    <div className="ml-auto flex items-center gap-2">
                      <button
                        onClick={async () => { if (selectedShopId) { await loadShopBookings(Number(selectedShopId)); await loadRescheduleRequests(Number(selectedShopId)); } }}
                        disabled={isLoadingShopBookings}
                        title="Atualizar lista"
                        aria-label="Atualizar lista"
                        className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium border ${isLoadingShopBookings ? 'bg-white text-gray-400 border-gray-200 cursor-not-allowed' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                      >
                        <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M3 10a7 7 0 1111.95 4.95l1.6 1.6a1 1 0 11-1.414 1.415l-1.6-1.6A7 7 0 013 10zm7-5a5 5 0 100 10 5 5 0 000-10z"/></svg>
                        <span className="hidden sm:inline">{isLoadingShopBookings ? 'Atualizando...' : 'Atualizar'}</span>
                      </button>
                    </div>
                </div>

                {isLoadingShopBookings && (
                  <div className="space-y-3">
                    {[1,2,3].map((i) => (
                      <div key={i} className="py-3">
                        <div className="animate-pulse flex items-start justify-between gap-4">
                          <div className="flex-1 space-y-2">
                            <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                            <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                          </div>
                          <div className="h-8 w-24 bg-gray-200 rounded"></div>
                        </div>
                      </div>
                    ))}
                  </div>
                )}
                {shopBookingsError && <p className="text-red-600">{shopBookingsError}</p>}
                {!isLoadingShopBookings && !shopBookingsError && (
                  <ul className="divide-y divide-gray-200">
                    {(() => {
                      const toDate = (b: BookingResponse) => new Date(`${b.date}T${b.time}:00`);
                      let items = (shopBookings || []);
                      // filtro por status (sempre um dos três)
                      const mapTab: any = { pendentes: 'pendente', confirmados: 'confirmado', finalizados: 'finalizado' };
                      items = items.filter(b => b.status === mapTab[shopBookingsTab]);
                      // if barber, restrict to own bookings only
                      if (user?.tipo_usuario === 'barbeiro') {
                        const myId = myBarberId;
                        items = items.filter(b => {
                          const bid = (b as any).barber_id ?? b.barbeiro?.id_barbeiro;
                          return myId ? Number(bid) === Number(myId) : false;
                        });
                      }
                      // esconder finalizados limpos localmente
                      if (shopBookingsTab === 'finalizados') {
                        items = items.filter((b) => !hiddenFinalizedIds.has(b.id));
                      }
                      // ordenar por data
                      items = items.sort((a, b) => +toDate(a) - +toDate(b));

                      if (items.length === 0) {
                        return <li className="py-3">Nenhum agendamento{user?.tipo_usuario === 'barbeiro' ? ' para você' : ''}.</li>;
                      }

                      return (
                        <>
                        {items.map((b) => (
                          <li key={b.id} className="py-3">
                            <div className="p-4 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                              <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between sm:gap-4">
                                <div className="flex-1 space-y-1">
                                  <div className="flex items-center gap-2 flex-wrap">
                                    <div className="h-6 w-6 rounded-full bg-gray-200 text-gray-700 flex items-center justify-center text-[10px] font-medium select-none overflow-hidden">
                                      {b.cliente?.avatar_url ? (
                                        <img src={b.cliente.avatar_url} alt={b.cliente?.nome || 'Cliente'} className="h-full w-full object-cover" />
                                      ) : (
                                        (() => {
                                          const name = (b.cliente?.nome || '').trim();
                                          const initials = name ? name.split(' ').filter(Boolean).slice(0,2).map(p => p[0]?.toUpperCase()).join('') : 'CL';
                                          return initials;
                                        })()
                                      )}
                                    </div>
                                    <span className="font-semibold capitalize text-gray-900">{b.service}</span>
                                    <span className={`inline-flex items-center gap-1 text-xs rounded-full px-2 py-0.5 capitalize ${
                                      b.status === 'pendente' ? 'bg-yellow-100 text-yellow-800' :
                                      b.status === 'confirmado' ? 'bg-green-100 text-green-800' :
                                      b.status === 'cancelado' ? 'bg-red-100 text-red-800' : 'bg-gray-100 text-gray-800'
                                    }`}>
                                      <svg className="h-3 w-3" viewBox="0 0 20 20" fill="currentColor">
                                        {b.status === 'pendente' && <path d="M10 2a8 8 0 100 16 8 8 0 000-16zm1 8V6a1 1 0 10-2 0v5a1 1 0 00.293.707l3 3a1 1 0 101.414-1.414L11 10z"/>}
                                        {b.status === 'confirmado' && <path fillRule="evenodd" d="M10 18a8 8 0 100-16 8 8 0 000 16zm3.707-9.707a1 1 0 00-1.414-1.414L9 10.586 7.707 9.293A1 1 0 006.293 10.707l2 2a1 1 0 001.414 0l4-4z" clipRule="evenodd"/>}
                                        {b.status === 'cancelado' && <path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/>}
                                        {b.status === 'finalizado' && <path d="M10 18a8 8 0 100-16 8 8 0 000 16z"/>}
                                      </svg>
                                      {b.status}
                                    </span>
                                  </div>
                                  <div className="text-sm text-gray-600 flex items-center gap-2">
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M6 2a1 1 0 000 2h8a1 1 0 100-2H6zM4 7a2 2 0 012-2h8a2 2 0 012 2v7a3 3 0 01-3 3H7a3 3 0 01-3-3V7z"/></svg>
                                    <span>{b.date} às {b.time}</span>
                                  </div>
                                  {(b.cliente?.nome || b.cliente?.telefone) && (
                                    <div className="text-sm text-gray-600 flex items-center gap-2">
                                      <span>Cliente: {b.cliente?.nome}{b.cliente?.telefone ? ` • ${b.cliente?.telefone}` : ''}</span>
                                    </div>
                                  )}
                                </div>
                                <div className="flex gap-2 flex-wrap sm:flex-nowrap w-full sm:w-auto justify-end">
                                  {b.status === 'pendente' && (
                                    <button
                                      onClick={() => handleShopConfirm(b.id)}
                                      disabled={shopConfirmingId === b.id}
                                      className={`inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${shopConfirmingId === b.id ? 'bg-green-300 cursor-not-allowed' : 'bg-green-600 hover:bg-green-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-green-500`}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414 0L9 11.586 6.707 9.293a1 1 0 00-1.414 1.414l3 3a1 1 0 001.414 0l7-7a1 1 0 000-1.414z" clipRule="evenodd"/></svg>
                                      {shopConfirmingId === b.id ? 'Confirmando...' : 'Confirmar'}
                                    </button>
                                  )}
                                  {(b.status === 'pendente' || b.status === 'confirmado') && (
                                    <button
                                      onClick={() => handleShopCancel(b.id)}
                                      disabled={shopCancellingId === b.id}
                                      className={`inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${shopCancellingId === b.id ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                                      {shopCancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
                                    </button>
                                  )}
                                  {b.status === 'confirmado' && (
                                    <button
                                      onClick={() => handleShopFinalize(b.id)}
                                      disabled={shopFinalizingId === b.id}
                                      className={`inline-flex items-center gap-2 px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${shopFinalizingId === b.id ? 'bg-gray-300 cursor-not-allowed' : 'bg-gray-700 hover:bg-gray-800'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-gray-500`}
                                    >
                                      <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M10 2a8 8 0 100 16 8 8 0 000-16z"/></svg>
                                      {shopFinalizingId === b.id ? 'Finalizando...' : 'Finalizar'}
                                    </button>
                                  )}
                                </div>
                              </div>
                            </div>
                          </li>
                        ))}
                        {shopBookingsTab === 'finalizados' && items.length > 0 && (
                          <li key="clear-finalizados" className="pt-2">
                            <button
                              onClick={handleClearFinalizedShop}
                              title="Limpar agendamentos finalizados"
                              aria-label="Limpar agendamentos finalizados"
                              className="w-full inline-flex items-center justify-center gap-2 px-3 py-2 rounded-md text-sm font-medium border bg-white text-gray-700 border-gray-300 hover:bg-gray-50 transition-colors"
                            >
                              <svg className="h-4 w-4 text-gray-600" viewBox="0 0 20 20" fill="currentColor"><path d="M6 6a1 1 0 011-1h6a1 1 0 011 1v9a2 2 0 01-2 2H8a2 2 0 01-2-2V6zM8 4a2 2 0 012-2h0a2 2 0 012 2h3a1 1 0 010 2H5a1 1 0 110-2h3z"/></svg>
                              <span>Limpar finalizados</span>
                            </button>
                          </li>
                        )}
                        </>
                      );
                    })()}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}

        {/* Services manage/create slide-over */}
        {showServices && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowServices(false)}
              aria-hidden
            />
            <aside className="ml-auto w-full max-w-md bg-white shadow-xl p-6 overflow-auto z-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Serviços da Barbearia</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowServices(false);
                      setServicesTab('gerenciar');
                      setServices(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-700">
                  Barbearia:{' '}
                  <span className="font-medium">
                    {barbershops.find((b) => b.id_barbearia === selectedShopId)?.nome || '—'}
                  </span>
                </p>
                <div className="flex gap-2" role="tablist" aria-label="Serviços - abas">
                  <button
                    onClick={() => setServicesTab('gerenciar')}
                    role="tab" aria-selected={servicesTab === 'gerenciar'}
                    className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium border ${servicesTab === 'gerenciar' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <span className="hidden sm:inline">Gerenciar</span>
                  </button>
                  {user.tipo_usuario === 'proprietario' && (
                    <button
                      onClick={() => setServicesTab('cadastrar')}
                      role="tab" aria-selected={servicesTab === 'cadastrar'}
                      className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium border ${servicesTab === 'cadastrar' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      <span className="hidden sm:inline">Cadastrar</span>
                    </button>
                  )}
                </div>
              </div>

              {servicesTab === 'gerenciar' ? (
                <div className="space-y-3">
                  {isLoadingServices && (
                    <div className="mt-3 space-y-3">
                      {[1,2,3].map((i) => (
                        <div key={i} className="p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                          <div className="animate-pulse flex items-start gap-3">
                            <div className="h-10 w-10 rounded bg-gray-200"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                            </div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {servicesError && <p className="text-red-600">{servicesError}</p>}
                  {!isLoadingServices && !servicesError && (
                    <div>
                      {(!services || services.length === 0) ? (
                        <p className="py-3 text-sm text-gray-600">Nenhum serviço cadastrado.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {(services || []).map((s) => {
                            const priceStr = typeof s.preco === 'number' ? s.preco.toFixed(2) : (s.preco || '');
                            const deleting = deletingServiceId === Number(s.id);
                            return (
                              <div key={s.id} className="p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                                <div className="flex items-start justify-between gap-4">
                                  <div>
                                    <p className="font-medium text-gray-900">{s.nome}</p>
                                    {s.descricao && <p className="text-sm text-gray-600">{s.descricao}</p>}
                                  </div>
                                  <div className="flex items-center gap-3">
                                    <div className="text-sm text-gray-700 whitespace-nowrap">{priceStr ? `R$ ${priceStr}` : '-'}</div>
                                    {user.tipo_usuario === 'proprietario' && (
                                      <button
                                        type="button"
                                        onClick={() => openDeleteServiceModal(Number(s.id), s.nome)}
                                        disabled={deleting}
                                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white ${deleting ? 'bg-gray-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'}`}
                                      >
                                        {deleting ? '...' : 'Excluir'}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleCreateService} className="space-y-5">
                  <div>
                    <p className="text-sm text-gray-600">Cadastre os serviços oferecidos e um preço.</p>
                  </div>
                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nome do serviço *</label>
                      <input
                        type="text"
                        placeholder="Ex.: Corte masculino"
                        value={serviceForm.nome}
                        onChange={(e) => setServiceForm({ ...serviceForm, nome: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Preço *</label>
                      <input
                        type="text"
                        placeholder="Ex.: 49.90"
                        value={serviceForm.preco}
                        onChange={(e) => setServiceForm({ ...serviceForm, preco: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Descrição (opcional)</label>
                      <textarea
                        rows={3}
                        placeholder="Detalhes do serviço, duração, etc."
                        value={serviceForm.descricao}
                        onChange={(e) => setServiceForm({ ...serviceForm, descricao: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                      />
                    </div>
                  </div>
                  {createServiceError && <p className="text-sm text-red-600">{createServiceError}</p>}
                  {(() => {
                    const valid = serviceForm.nome.trim().length >= 2 && serviceForm.preco.trim() !== '';
                    return (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowServices(false)}
                          className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={creatingService || !valid}
                          className={`px-4 py-2 rounded-md text-white text-sm ${creatingService || !valid ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                          title={!valid ? 'Preencha os campos obrigatórios corretamente.' : undefined}
                        >
                          {creatingService ? 'Enviando...' : 'Cadastrar'}
                        </button>
                      </div>
                    );
                  })()}
                </form>
              )}
            </aside>
          </div>
        )}

        {/* Barbers manage/create slide-over */}
        {showBarbers && (
          <div className="fixed inset-0 z-50 flex">
            <div
              className="fixed inset-0 bg-black/40 z-40"
              onClick={() => setShowBarbers(false)}
              aria-hidden
            />
            <aside className="ml-auto w-full max-w-md bg-white shadow-xl p-6 overflow-auto z-50">
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Barbeiros da Barbearia</h3>
                <div className="flex items-center gap-2">
                  <button
                    onClick={() => {
                      setShowBarbers(false);
                      setBarbersTab('gerenciar');
                      setBarbers(null);
                    }}
                    className="text-gray-500 hover:text-gray-700"
                    aria-label="Fechar"
                  >
                    ✕
                  </button>
                </div>
              </div>

              <div className="flex items-center justify-between mb-2">
                <p className="text-sm text-gray-700">
                  Barbearia:{' '}
                  <span className="font-medium">
                    {barbershops.find((b) => b.id_barbearia === selectedShopId)?.nome || '—'}
                  </span>
                </p>
                <div className="flex gap-2" role="tablist" aria-label="Barbeiros - abas">
                  <button
                    onClick={() => setBarbersTab('gerenciar')}
                    role="tab" aria-selected={barbersTab === 'gerenciar'}
                    className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium border ${barbersTab === 'gerenciar' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                  >
                    <span className="hidden sm:inline">Gerenciar</span>
                  </button>
                  {user.tipo_usuario === 'proprietario' && (
                    <button
                      onClick={() => setBarbersTab('cadastrar')}
                      role="tab" aria-selected={barbersTab === 'cadastrar'}
                      className={`inline-flex items-center gap-1 sm:gap-2 px-2 py-1 sm:px-3 sm:py-2 rounded-md text-xs sm:text-sm font-medium border ${barbersTab === 'cadastrar' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                    >
                      <span className="hidden sm:inline">Cadastrar</span>
                    </button>
                  )}
                </div>
              </div>

              {barbersTab === 'gerenciar' ? (
                <div className="space-y-3">
                  <div className="flex items-center gap-3">
                    {/* 'Mostrar inativos' removed per request */}
                    <button
                      onClick={() => selectedShopId && loadBarbers(Number(selectedShopId))}
                      disabled={isLoadingBarbers}
                      className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white transition-colors duration-200 ${isLoadingBarbers ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500`}
                    >
                      {isLoadingBarbers ? 'Atualizando...' : 'Atualizar'}
                    </button>
                  </div>
                  {isLoadingBarbers && (
                    <div className="mt-3 space-y-3">
                      {[1,2,3].map((i) => (
                        <div key={i} className="p-3 border border-gray-200 rounded-lg bg-white shadow-sm">
                          <div className="animate-pulse flex items-start gap-3">
                            <div className="h-10 w-10 rounded-full bg-gray-200"></div>
                            <div className="flex-1 space-y-2">
                              <div className="h-4 bg-gray-200 rounded w-1/3"></div>
                              <div className="h-3 bg-gray-200 rounded w-1/2"></div>
                              <div className="h-3 bg-gray-100 rounded w-1/4"></div>
                            </div>
                            <div className="h-8 w-24 bg-gray-200 rounded"></div>
                          </div>
                        </div>
                      ))}
                    </div>
                  )}
                  {barbersError && <p className="text-red-600">{barbersError}</p>}
                  {!isLoadingBarbers && !barbersError && (
                    <div>
                      {(barbers || []).some((b: any) => !b?.id_barbeiro) && user.tipo_usuario === 'proprietario' && (
                        <div className="mb-2 text-xs text-yellow-800 bg-yellow-50 border border-yellow-200 rounded px-2 py-1">
                          Alguns barbeiros não possuem <code>id_barbeiro</code> no retorno. Solicite ajuste no backend; o toggle foi desabilitado para esses itens.
                        </div>
                      )}
                      {(!barbers || barbers.length === 0) ? (
                        <p className="py-3 text-sm text-gray-600">Nenhum barbeiro cadastrado.</p>
                      ) : (
                        <div className="grid grid-cols-1 gap-3">
                          {(barbers || []).map((barbeiro) => {
                            const key = (barbeiro as any).id_barbeiro ?? `${barbeiro.id_usuario}-${barbeiro.email}`;
                            const initials = (barbeiro?.nome || '')
                              .split(' ')
                              .filter(Boolean)
                              .slice(0, 2)
                              .map((p) => p[0]?.toUpperCase())
                              .join('') || 'BB';
                            const specialties = (barbeiro as any)?.especialidades
                              ? String((barbeiro as any).especialidades)
                                  .split(',')
                                  .map((s) => s.trim())
                                  .filter(Boolean)
                              : [] as string[];
                            const canToggle = user.tipo_usuario === 'proprietario' && !!(barbeiro as any).id_barbeiro;
                            const busy = togglingBarberId === (barbeiro as any).id_barbeiro;
                            return (
                              <div key={key} className="p-3 border border-gray-200 rounded-lg bg-white shadow-sm hover:shadow-md transition-shadow">
                                <div className="flex items-start justify-between gap-4">
                                  <div className="flex items-start gap-3">
                                    <div className="h-10 w-10 rounded-full bg-indigo-600 text-white flex items-center justify-center text-sm font-semibold select-none overflow-hidden">
                                      {barbeiro.avatar_url ? (
                                        // eslint-disable-next-line @typescript-eslint/ban-ts-comment
                                        // @ts-ignore
                                        <img src={barbeiro.avatar_url} alt={barbeiro.nome} className="h-full w-full object-cover" />
                                      ) : (
                                        initials
                                      )}
                                    </div>
                                    <div>
                                      <div className="flex items-center gap-2 flex-wrap">
                                        <p className="font-medium text-gray-900">{barbeiro.nome}</p>
                                        <span className={`text-xs rounded-full px-2 py-0.5 ${barbeiro.ativo ? 'bg-green-100 text-green-800' : 'bg-gray-100 text-gray-800'}`}>{barbeiro.ativo ? 'Ativo' : 'Inativo'}</span>
                                        {(() => {
                                          const id = Number((barbeiro as any).id_barbeiro);
                                          const rev = Number.isFinite(id) ? barberReviewsMap[id] : undefined;
                                          if (!rev) return null;
                                          return (
                                            <span className="inline-flex items-center gap-1 text-xs text-gray-700">
                                              <span className="inline-flex">
                                                {[1,2,3,4,5].map(n => (
                                                  <svg key={n} className={`h-3.5 w-3.5 ${((rev.average||0) >= n - 0.5) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z"/></svg>
                                                ))}
                                              </span>
                                              <span className="tabular-nums">{rev.average ? rev.average.toFixed(1) : '—'}</span>
                                              <span className="text-gray-500">({rev.total})</span>
                                            </span>
                                          );
                                        })()}
                                      </div>
                                      <p className="text-sm text-gray-600">{barbeiro.email}{barbeiro.telefone ? ` • ${barbeiro.telefone}` : ''}</p>
                                      {specialties.length > 0 && (
                                        <div className="mt-2 flex flex-wrap gap-1">
                                          {specialties.map((sp, i) => (
                                            <span key={i} className="inline-flex items-center rounded-full bg-indigo-50 text-indigo-700 px-2 py-0.5 text-xs border border-indigo-100">
                                              {sp}
                                            </span>
                                          ))}
                                        </div>
                                      )}
                                      {/* Edição de foto removida do painel do proprietário */}
                                    </div>
                                  </div>
                                  <div className="flex items-center gap-2">
                                    {user.tipo_usuario === 'proprietario' && (
                                      <button
                                        onClick={() => {
                                          if (!(barbeiro as any).id_barbeiro) return;
                                          const id = (barbeiro as any).id_barbeiro;
                                          if (barbeiro.ativo) {
                                            openDeleteBarberModal(id);
                                          } else {
                                            handleToggleBarber(id, true);
                                          }
                                        }}
                                        disabled={!canToggle || busy}
                                        title={!canToggle ? 'Sem id_barbeiro — solicite ajuste no backend' : undefined}
                                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                                          !canToggle || busy
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : (barbeiro.ativo ? 'bg-red-600 hover:bg-red-700' : 'bg-green-600 hover:bg-green-700')
                                        }`}
                                      >
                                        {busy ? '...' : (barbeiro.ativo ? 'Excluir' : 'Ativar')}
                                      </button>
                                    )}
                                  </div>
                                </div>
                              </div>
                            );
                          })}
                        </div>
                      )}
                    </div>
                  )}
                </div>
              ) : (
                <form onSubmit={handleCreateBarber} className="space-y-5">
                  <div>
                    <p className="text-sm text-gray-600">
                      Preencha os dados do novo barbeiro. Os campos com “*” são obrigatórios.
                    </p>
                  </div>

                  <div className="space-y-4">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Nome *</label>
                      <input
                        type="text"
                        placeholder="Ex.: João Silva"
                        value={barberForm.nome}
                        onChange={(e) => setBarberForm({ ...barberForm, nome: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        autoComplete="name"
                      />
                      {barberForm.nome.trim() !== '' && barberForm.nome.trim().length < 3 && (
                        <p className="mt-1 text-xs text-red-600">Informe pelo menos 3 caracteres.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Email *</label>
                      <input
                        type="email"
                        placeholder="exemplo@dominio.com"
                        value={barberForm.email}
                        onChange={(e) => setBarberForm({ ...barberForm, email: e.target.value })}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        autoComplete="email"
                      />
                      {barberForm.email !== '' && !/^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(barberForm.email) && (
                        <p className="mt-1 text-xs text-red-600">Informe um email válido.</p>
                      )}
                    </div>
                    <fieldset>
                      <legend className="block text-sm font-medium text-gray-700">Serviços (especialidades)</legend>
                      {isLoadingServices ? (
                        <p className="mt-2 text-sm text-gray-600">Carregando serviços...</p>
                      ) : servicesError ? (
                        <p className="mt-2 text-sm text-red-600">{servicesError}</p>
                      ) : (
                        <div className="mt-2 grid grid-cols-2 gap-2">
                          {(services || []).map((srv) => {
                            const key = srv.nome;
                            const checked = barberForm.especialidades.includes(key);
                            return (
                              <label
                                key={srv.id}
                                className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                                  checked ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'
                                }`}
                              >
                                <span className="font-medium">
                                  {srv.nome}{srv.preco ? ` — R$ ${srv.preco}` : ''}
                                </span>
                                <input
                                  type="checkbox"
                                  value={key}
                                  checked={checked}
                                  onChange={(e) => {
                                    const v = key;
                                    const next = e.target.checked
                                      ? Array.from(new Set([...(barberForm.especialidades || []), v]))
                                      : (barberForm.especialidades || []).filter((s) => s !== v);
                                    setBarberForm({ ...barberForm, especialidades: next });
                                  }}
                                  className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                                />
                              </label>
                            );
                          })}
                          {services && services.length === 0 && (
                            <p className="col-span-2 text-xs text-gray-500">Nenhum serviço cadastrado para esta barbearia.</p>
                          )}
                        </div>
                      )}
                    </fieldset>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Telefone *</label>
                      <input
                        type="tel"
                        inputMode="numeric"
                        placeholder="(11) 98888-7777"
                        value={barberForm.telefone}
                        onChange={(e) => {
                          const digits = e.target.value.replace(/\D/g, '').slice(0, 11);
                          // Formatação simples BR
                          let formatted = digits;
                          if (digits.length > 2 && digits.length <= 6) {
                            formatted = `(${digits.slice(0,2)}) ${digits.slice(2)}`;
                          } else if (digits.length > 6 && digits.length <= 10) {
                            formatted = `(${digits.slice(0,2)}) ${digits.slice(2,6)}-${digits.slice(6)}`;
                          } else if (digits.length === 11) {
                            formatted = `(${digits.slice(0,2)}) ${digits.slice(2,7)}-${digits.slice(7)}`;
                          } else if (digits.length <= 2) {
                            formatted = digits;
                          }
                          setBarberForm({ ...barberForm, telefone: formatted });
                        }}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:ring-indigo-500 focus:border-indigo-500"
                        required
                        autoComplete="tel"
                      />
                      {(() => {
                        const len = barberForm.telefone.replace(/\D/g, '').length;
                        return barberForm.telefone !== '' && (len < 10 || len > 11) ? (
                          <p className="mt-1 text-xs text-red-600">Informe DDD + telefone (10 a 11 dígitos).</p>
                        ) : null;
                      })()}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Senha *</label>
                      <div className="mt-1 relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Mín. 6 caracteres"
                          value={barberForm.senha}
                          onChange={(e) => setBarberForm({ ...barberForm, senha: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm pr-20 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                          autoComplete="new-password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 px-3 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      {barberForm.senha !== '' && barberForm.senha.length < 6 && (
                        <p className="mt-1 text-xs text-red-600">A senha deve ter ao menos 6 caracteres.</p>
                      )}
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Confirmar Senha *</label>
                      <div className="mt-1 relative">
                        <input
                          type={showPassword ? 'text' : 'password'}
                          placeholder="Repita a senha"
                          value={barberForm.confirmarSenha}
                          onChange={(e) => setBarberForm({ ...barberForm, confirmarSenha: e.target.value })}
                          className="block w-full rounded-md border-gray-300 shadow-sm pr-20 focus:ring-indigo-500 focus:border-indigo-500"
                          required
                          autoComplete="new-password"
                          minLength={6}
                        />
                        <button
                          type="button"
                          onClick={() => setShowPassword((v) => !v)}
                          className="absolute inset-y-0 right-0 px-3 text-sm text-indigo-600 hover:text-indigo-700"
                        >
                          {showPassword ? 'Ocultar' : 'Mostrar'}
                        </button>
                      </div>
                      {barberForm.confirmarSenha !== '' && barberForm.confirmarSenha !== barberForm.senha && (
                        <p className="mt-1 text-xs text-red-600">As senhas não coincidem.</p>
                      )}
                    </div>
                  </div>

                  {createBarberError && <p className="text-sm text-red-600">{createBarberError}</p>}

                  {(() => {
                    const nameOk = barberForm.nome.trim().length >= 3;
                    const emailOk = /^([^\s@]+)@([^\s@]+)\.[^\s@]+$/.test(barberForm.email);
                    const phoneLen = barberForm.telefone.replace(/\D/g, '').length;
                    const phoneOk = phoneLen >= 10 && phoneLen <= 11;
                    const passOk = barberForm.senha.length >= 6;
                    const passMatch = barberForm.senha === barberForm.confirmarSenha;
                    const valid = nameOk && emailOk && phoneOk && passOk && passMatch;
                    return (
                      <div className="flex justify-end gap-2">
                        <button
                          type="button"
                          onClick={() => setShowBarbers(false)}
                          className="px-4 py-2 rounded-md border border-gray-300 bg-white text-sm"
                        >
                          Cancelar
                        </button>
                        <button
                          type="submit"
                          disabled={createBarberLoading || !valid}
                          className={`px-4 py-2 rounded-md text-white text-sm ${createBarberLoading || !valid ? 'bg-indigo-400 cursor-not-allowed' : 'bg-indigo-600 hover:bg-indigo-700'}`}
                          title={!valid ? 'Preencha os campos obrigatórios corretamente.' : undefined}
                        >
                          {createBarberLoading ? 'Enviando...' : 'Cadastrar'}
                        </button>
                      </div>
                    );
                  })()}
                </form>
              )}
            </aside>
          </div>
        )}
      </div>

      {/* Toast Notifications */}
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

      {/* Modal de Sucesso - Cadastro de Barbeiro */}
      {showSuccessBarberModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-green-500/30 shadow-2xl shadow-green-500/20 animate-[fadeInUp_0.3s_ease-out]">
            {/* Ícone de Sucesso */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-600 to-emerald-700 rounded-full p-4">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Título e Mensagem */}
            <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Barbeiro Cadastrado!
            </h3>
            <p className="text-gray-300 text-center mb-8 leading-relaxed">
              O barbeiro foi cadastrado com sucesso e já está disponível para atendimento.
            </p>

            {/* Botão */}
            <button
              onClick={() => setShowSuccessBarberModal(false)}
              className="group relative w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/50 hover:-translate-y-0.5 overflow-hidden"
            >
              <span className="relative z-10">Entendido!</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Excluir Barbeiro */}
      {showDeleteBarberModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-red-500/30 shadow-2xl shadow-red-500/20 animate-[fadeInUp_0.3s_ease-out]">
            {/* Ícone de Aviso */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-red-600 to-red-700 rounded-full p-4">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Título e Mensagem */}
            <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
              Excluir Barbeiro?
            </h3>
            <p className="text-gray-300 text-center mb-8 leading-relaxed">
              Tem certeza que deseja excluir este barbeiro? Esta ação não poderá ser desfeita.
            </p>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteBarberModal(false);
                  setBarberToDelete(null);
                }}
                className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteBarber}
                className="group relative flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/50 hover:-translate-y-0.5 overflow-hidden"
              >
                <span className="relative z-10">Sim, excluir</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Excluir Serviço */}
      {showDeleteServiceModal && serviceToDelete && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-red-500/30 shadow-2xl shadow-red-500/20 animate-[fadeInUp_0.3s_ease-out]">
            {/* Ícone de Aviso */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-red-600 to-red-700 rounded-full p-4">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Título e Mensagem */}
            <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
              Excluir Serviço?
            </h3>
            <p className="text-gray-300 text-center mb-2 leading-relaxed">
              Deseja excluir o serviço <span className="text-amber-400 font-semibold">"{serviceToDelete.nome}"</span>?
            </p>
            <p className="text-gray-400 text-center mb-8 text-sm">
              Esta ação não pode ser desfeita.
            </p>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowDeleteServiceModal(false);
                  setServiceToDelete(null);
                }}
                className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Cancelar
              </button>
              <button
                onClick={executeDeleteService}
                className="group relative flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/50 hover:-translate-y-0.5 overflow-hidden"
              >
                <span className="relative z-10">Sim, excluir</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Modal de Sucesso - Confirmar Agendamento */}
      {showConfirmBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-green-500/30 shadow-2xl shadow-green-500/20 animate-[fadeInUp_0.3s_ease-out]">
            {/* Ícone de Sucesso */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-600 to-emerald-700 rounded-full p-4">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Título e Mensagem */}
            <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Agendamento Confirmado!
            </h3>
            <p className="text-gray-300 text-center mb-8 leading-relaxed">
              O agendamento foi confirmado com sucesso. O cliente será notificado.
            </p>

            {/* Botão */}
            <button
              onClick={() => setShowConfirmBookingModal(false)}
              className="group relative w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/50 hover:-translate-y-0.5 overflow-hidden"
            >
              <span className="relative z-10">Entendido!</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            </button>
          </div>
        </div>
      )}

      {/* Modal de Confirmação - Cancelar Agendamento */}
      {showCancelBookingModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-red-500/30 shadow-2xl shadow-red-500/20 animate-[fadeInUp_0.3s_ease-out]">
            {/* Ícone de Aviso */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-red-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-red-600 to-red-700 rounded-full p-4">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Título e Mensagem */}
            <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-red-400 to-red-500 bg-clip-text text-transparent">
              Cancelar Agendamento?
            </h3>
            <p className="text-gray-300 text-center mb-8 leading-relaxed">
              Tem certeza que deseja cancelar este agendamento? O cliente será notificado sobre o cancelamento.
            </p>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelBookingModal(false);
                  setBookingToCancelShop(null);
                }}
                className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Não, manter
              </button>
              <button
                onClick={() => {
                  // Determina qual função chamar baseado no contexto
                  if (showMyBookings) {
                    executeCancelBooking();
                  } else {
                    executeShopCancel();
                  }
                }}
                className="group relative flex-1 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-red-500/50 hover:-translate-y-0.5 overflow-hidden"
              >
                <span className="relative z-10">Sim, cancelar</span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
};

export default Dashboard;