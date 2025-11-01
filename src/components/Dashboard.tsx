import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { BookingForm, BookingRequest, BookingResponse, Barbearia, Barbeiro, User } from '../types';
import { bookingService, barbershopService, barberService, uploadService, evaluationService } from '../services/api';
import type { ReviewTarget } from '../types';

const Dashboard: React.FC = () => {
  const { user, token, login, logout } = useAuth();
  const navigate = useNavigate();

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
  const [showInactive, setShowInactive] = useState(false);
  const [uploadingUserAvatar, setUploadingUserAvatar] = useState(false);
  const fileInputUserRef = React.useRef<HTMLInputElement | null>(null);
  const openUserFilePicker = () => fileInputUserRef.current?.click();
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
          alert('Não foi possível identificar seu cadastro de barbeiro para atualizar a foto.');
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
        alert('Foto atualizada.');
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
        alert('Foto atualizada.');
      }
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Falha ao enviar foto.');
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

  const handleCancelBooking = async (id: number) => {
    if (!window.confirm('Deseja cancelar este agendamento?')) return;
    setCancellingId(id);
    try {
      await bookingService.cancel(id);
      await loadBookings();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao cancelar agendamento.';
      alert(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const loadShopBookings = async (barbeariaId: number) => {
    setIsLoadingShopBookings(true);
    setShopBookingsError(null);
    try {
      const list = await bookingService.listByBarbershop(barbeariaId);
      setShopBookings(list);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos da barbearia.';
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
          } catch (e) {
            // ignore; fallback will show empty if id not found
            setMyBarberId(null);
          }
        }
        await loadShopBookings(first.id_barbearia);
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
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao confirmar.');
    } finally {
      setShopConfirmingId(null);
    }
  };

  // Reviews summary for current selected shop
  const [shopReviews, setShopReviews] = useState<{ average: number | null; total: number; items?: any[] } | null>(null);
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

  const handleShopFinalize = async (id: number) => {
    setShopFinalizingId(id);
    try {
      await bookingService.finalize(id);
      if (selectedShopId) await loadShopBookings(Number(selectedShopId));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao finalizar.');
    } finally {
      setShopFinalizingId(null);
    }
  };

  const handleShopCancel = async (id: number) => {
    if (!window.confirm('Deseja cancelar este agendamento?')) return;
    setShopCancellingId(id);
    try {
      await bookingService.cancel(id);
      if (selectedShopId) await loadShopBookings(Number(selectedShopId));
    } catch (err: any) {
      alert(err?.response?.data?.message || err?.message || 'Erro ao cancelar.');
    } finally {
      setShopCancellingId(null);
    }
  };

  // Persist hidden finalized bookings in localStorage
  useEffect(() => {
    try {
      const saved = localStorage.getItem('hidden_finalized_booking_ids');
      if (saved) {
        const arr: number[] = JSON.parse(saved);
        if (Array.isArray(arr)) setHiddenFinalizedIds(new Set(arr.map(Number)));
      }
    } catch {}
  }, []);

  useEffect(() => {
    try {
      localStorage.setItem('hidden_finalized_booking_ids', JSON.stringify(Array.from(hiddenFinalizedIds)));
    } catch {}
  }, [hiddenFinalizedIds]);

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
      alert('Escolha uma nota de 1 a 5 estrelas.');
      return;
    }
    const comentario = reviewComment.trim();
    if (comentario.length > 1000) {
      alert('Comentário muito longo (máx. 1000 caracteres).');
      return;
    }
    setIsSubmittingReview(true);
    try {
      await evaluationService.create({ id_booking: reviewBookingId, target: reviewTarget, rating: reviewRating, comentario });
      // Mark as evaluated for the chosen target
      setEvaluatedKeys(prev => new Set([...Array.from(prev), `${reviewBookingId}:${reviewTarget}`]));
      setShowReviewModal(false);
      alert('Avaliação enviada. Obrigado!');
    } catch (err: any) {
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Falha ao enviar avaliação.';
      if (status === 409) {
        // Já existe avaliação para esse booking/target — trata amigável e marca localmente
        setEvaluatedKeys(prev => new Set([...Array.from(prev), `${reviewBookingId}:${reviewTarget}`]));
        setShowReviewModal(false);
        alert('Você já avaliou este destino para este agendamento.');
      } else if (status === 400) {
        alert('Agendamento ainda não finalizado. Tente novamente quando estiver finalizado.');
      } else if (status === 403) {
        alert('Você não pode avaliar este agendamento.');
      } else if (status === 404) {
        alert('Agendamento não encontrado para avaliação.');
      } else {
        alert(msg);
      }
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const handleClearFinalizedMine = () => {
    const finals = (bookings || []).filter((b) => b.status === 'finalizado');
    if (finals.length === 0) return;
    setHiddenFinalizedIds((prev) => new Set([...Array.from(prev), ...finals.map((b) => b.id)]));
  };
  const handleClearFinalizedShop = () => {
    const finals = (shopBookings || []).filter((b) => b.status === 'finalizado');
    if (finals.length === 0) return;
    setHiddenFinalizedIds((prev) => new Set([...Array.from(prev), ...finals.map((b) => b.id)]));
  };

  // Load barbers for selected barbershop when entering booking step 2
  useEffect(() => {
    const loadForBooking = async () => {
      if (bookingStep !== 2 || !selectedBarbershopId) return;
      setIsLoadingAvailableBarbers(true);
      setAvailableBarbersError(null);
      setAvailableBarbers(null);
      // reset selected barber for safety when switching shop
      setBooking((prev) => ({ ...prev, barber_id: '' }));
      try {
        const list = await barberService.listByBarbershop(Number(selectedBarbershopId), { onlyActive: true });
        setAvailableBarbers(list || []);
      } catch (err: any) {
        const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar barbeiros da barbearia.';
        setAvailableBarbersError(msg);
      } finally {
        setIsLoadingAvailableBarbers(false);
      }
    };
    loadForBooking();
  }, [bookingStep, selectedBarbershopId]);

  // Barbers panel helpers
  const loadBarbers = async (barbeariaId: number, opts?: { onlyActive?: boolean }) => {
    setIsLoadingBarbers(true);
    setBarbersError(null);
    try {
      const list = await barberService.listByBarbershop(barbeariaId, { onlyActive: opts?.onlyActive ?? !showInactive });
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
  await loadBarbers(first.id_barbearia, { onlyActive: !showInactive });
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

  const handleToggleBarber = async (id_barbeiro: number, nextAtivo: boolean) => {
    if (user?.tipo_usuario !== 'proprietario') {
      alert('Apenas o proprietário pode alterar o status de barbeiros.');
      return;
    }
    if (!barbers) return;
    // optimistic update
    setTogglingBarberId(id_barbeiro);
    const prev = barbers.slice();
    const idx = prev.findIndex((b: any) => (b?.id_barbeiro) === id_barbeiro);
    if (idx === -1) {
      setTogglingBarberId(null);
      alert('Barbeiro não encontrado na lista.');
      return;
    }
    const next = prev.map((b: any) => (
      (b?.id_barbeiro) === id_barbeiro ? { ...b, ativo: nextAtivo } : b
    ));
    setBarbers(next as any);
    try {
      await barberService.setActive(id_barbeiro, nextAtivo);
      // sucesso: manter estado otimista
      alert('Status atualizado.');
    } catch (err: any) {
      // revert
      setBarbers(prev as any);
      const status = err?.response?.status;
      const msg = err?.response?.data?.message || err?.message || 'Erro ao atualizar barbeiro.';
      if (status === 401) {
        alert(msg || 'Sessão expirada. Faça login novamente.');
        await logout();
        navigate('/login');
      } else if (status === 403) {
        alert('Acesso negado. Apenas o proprietário pode alterar o status.');
      } else if (status === 404) {
        alert('Barbeiro não encontrado. A lista será recarregada.');
        if (selectedShopId) await loadBarbers(Number(selectedShopId));
      } else if (status === 400) {
        alert(msg || 'Payload inválido.');
      } else {
        alert(msg || 'Erro interno. Tente novamente.');
      }
    } finally {
      setTogglingBarberId(null);
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
      alert('Barbeiro cadastrado com sucesso.');
    } catch (err: any) {
      setCreateBarberError(err?.response?.data?.message || err?.message || 'Erro ao cadastrar barbeiro.');
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

  // Toggle service selection with Combo exclusivity
  const toggleService = (key: 'Corte' | 'Barba' | 'Sobrancelha' | 'Combo') => {
    setBooking(prev => {
      let next = prev.service.slice();
      const has = next.includes(key);
      if (key === 'Combo') {
        next = has ? [] : ['Combo'];
      } else {
        // selecting any non-Combo removes Combo if present
        next = next.filter(s => s !== 'Combo');
        if (has) {
          next = next.filter(s => s !== key);
        } else {
          next.push(key);
        }
      }
      return { ...prev, service: next };
    });
  };

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
    if (!booking.service || booking.service.length === 0) {
      alert('Selecione pelo menos um serviço.');
      return;
    }
    if (booking.barber_id === '' || booking.barber_id == null) {
      alert('Selecione um barbeiro.');
      return;
    }
    setIsSubmitting(true);
    try {
      const serviceString = booking.service.includes('Combo')
        ? 'Combo'
        : booking.service.join(', ');
      const payload: BookingRequest = {
        id_barbearia: Number(selectedBarbershopId),
        service: serviceString,
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
                        <dt className="text-sm font-medium text-gray-500 truncate">
                          Serviços
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Em breve
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
                            onClick={async () => {
                              setSelectedBarbershopId('');
                              setBooking({ service: [], date: '', time: '', barber_id: '', notes: '' });
                              setBookingStep(1);
                              setShowBooking(true);
                              setIsLoadingBarbershops(true);
                              setBarbershopError(null);
                              try {
                                const data = await barbershopService.list();
                                setBarbershops(data);
                              } catch (err: any) {
                                const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar barbearias.';
                                setBarbershopError(msg);
                              } finally {
                                setIsLoadingBarbershops(false);
                              }
                            }}
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
                            onClick={() => handleOpenMyBookings('proximos')}
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
                            onClick={() => handleOpenMyBookings('historico')}
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
                <form onSubmit={handleBookingSubmit} className="space-y-4">
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

                  <fieldset>
                    <legend className="block text-sm font-medium text-gray-700">Serviço(s)</legend>
                    <div className="mt-2 grid grid-cols-2 gap-2">
                      {([
                        { key: 'Corte', label: 'Corte' },
                        { key: 'Barba', label: 'Barba' },
                        { key: 'Sobrancelha', label: 'Sobrancelha' },
                        { key: 'Combo', label: 'Combo' },
                      ] as const).map((opt) => {
                        const selected = booking.service.includes(opt.key);
                        return (
                          <label
                            key={opt.key}
                            className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                              selected ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'
                            }`}
                          >
                            <span className="font-medium">{opt.label}</span>
                            <input
                              type="checkbox"
                              value={opt.key}
                              checked={selected}
                              onChange={() => toggleService(opt.key)}
                              className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                            />
                          </label>
                        );
                      })}
                    </div>
                    <p className="mt-1 text-xs text-gray-500">Selecione pelo menos um. Se escolher Combo, será apenas ele.</p>
                  </fieldset>

                  <div className="grid grid-cols-2 gap-2">
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Data</label>
                      <input
                        type="date"
                        name="date"
                        value={booking.date}
                        onChange={handleBookingChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                      />
                    </div>
                    <div>
                      <label className="block text-sm font-medium text-gray-700">Hora</label>
                      <input
                        type="time"
                        name="time"
                        value={booking.time}
                        onChange={handleBookingChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                        required
                      />
                    </div>
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Barbeiro</label>
                    {isLoadingAvailableBarbers ? (
                      <p className="mt-1 text-sm text-gray-600">Carregando barbeiros...</p>
                    ) : availableBarbersError ? (
                      <p className="mt-1 text-sm text-red-600">{availableBarbersError}</p>
                    ) : (
                      <select
                        name="barber_id"
                        value={booking.barber_id as any}
                        onChange={handleBookingChange}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm bg-white"
                        disabled={!availableBarbers || availableBarbers.length === 0}
                        required
                      >
                        <option value="">— Selecionar —</option>
                        {(availableBarbers || []).map((b) => (
                          <option key={(b as any).id_barbeiro ?? b.id_usuario} value={(b as any).id_barbeiro ?? ''}>
                            {b.nome}{b.telefone ? ` • ${b.telefone}` : ''}{b.especialidades ? ` — ${b.especialidades}` : ''}
                          </option>
                        ))}
                      </select>
                    )}
                    {availableBarbers && availableBarbers.length === 0 && !availableBarbersError && !isLoadingAvailableBarbers && (
                      <p className="mt-1 text-xs text-gray-500">Nenhum barbeiro ativo disponível nesta barbearia.</p>
                    )}
                  </div>

                  <div>
                    <label className="block text-sm font-medium text-gray-700">Observações</label>
                    <textarea
                      name="notes"
                      value={booking.notes}
                      onChange={handleBookingChange}
                      className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                      rows={3}
                    />
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
                <button
                  onClick={() => setShowMyBookings(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fechar"
                >
                  ✕
                </button>
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
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    disabled={cancellingId === b.id}
                                    className={`inline-flex items-center gap-2 px-3 py-2 rounded-md text-sm font-medium border ${cancellingId === b.id ? 'bg-white text-red-300 border-red-200 cursor-not-allowed' : 'bg-white text-red-700 border-red-300 hover:bg-red-50'}`}
                                  >
                                    <svg className="h-4 w-4" viewBox="0 0 20 20" fill="currentColor"><path d="M4.293 4.293a1 1 0 011.414 0L10 8.586l4.293-4.293a1 1 0 111.414 1.414L11.414 10l4.293 4.293a1 1 0 01-1.414 1.414L10 11.414l-4.293 4.293a1 1 0 01-1.414-1.414L8.586 10 4.293 5.707a1 1 0 010-1.414z"/></svg>
                                    {cancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
                                  </button>
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
                <h3 className="text-lg font-medium text-gray-900">Agendamentos da Barbearia</h3>
                <button
                  onClick={() => {
                    setShowShopBookings(false);
                    setSelectedShopId('');
                    setShopBookings(null);
                  }}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fechar"
                >
                  ✕
                </button>
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
                {selectedShopId && shopReviews && (
                  <div className="flex items-center gap-2 text-sm text-gray-700">
                    <div className="inline-flex items-center">
                      {[1,2,3,4,5].map(n => (
                        <svg key={n} className={`h-4 w-4 ${((shopReviews.average||0) >= n - 0.5) ? 'text-yellow-400' : 'text-gray-300'}`} viewBox="0 0 20 20" fill="currentColor"><path d="M10 15l-5.878 3.09 1.122-6.545L.488 6.91l6.561-.954L10 0l2.951 5.956 6.561.954-4.756 4.635 1.122 6.545z"/></svg>
                      ))}
                    </div>
                    <span className="tabular-nums">{shopReviews.average ? shopReviews.average.toFixed(1) : '—'}</span>
                    <span className="text-gray-500">({shopReviews.total})</span>
                  </div>
                )}

                <div className="mb-2 flex items-center gap-2 overflow-x-auto whitespace-nowrap" role="tablist" aria-label="Agendamentos da barbearia - abas">
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
                        onClick={() => selectedShopId && loadShopBookings(Number(selectedShopId))}
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
                              <div className="flex items-start justify-between gap-4">
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
                                <div className="flex items-center gap-2">
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
                    <label className="inline-flex items-center gap-2 text-sm text-gray-700 select-none">
                      <input
                        type="checkbox"
                        checked={showInactive}
                        onChange={async (e) => {
                          const checked = e.target.checked;
                          setShowInactive(checked);
                          if (selectedShopId) {
                            await loadBarbers(Number(selectedShopId), { onlyActive: !checked });
                          }
                        }}
                        className="h-4 w-4 text-indigo-600 border-gray-300 focus:ring-indigo-500"
                      />
                      Mostrar inativos
                    </label>
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
                                        onClick={() => (barbeiro as any).id_barbeiro && handleToggleBarber((barbeiro as any).id_barbeiro, !barbeiro.ativo)}
                                        disabled={!canToggle || busy}
                                        title={!canToggle ? 'Sem id_barbeiro — solicite ajuste no backend' : undefined}
                                        className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium text-white transition-colors ${
                                          !canToggle || busy
                                            ? 'bg-gray-300 cursor-not-allowed'
                                            : (barbeiro.ativo ? 'bg-yellow-600 hover:bg-yellow-700' : 'bg-green-600 hover:bg-green-700')
                                        }`}
                                      >
                                        {busy ? '...' : (barbeiro.ativo ? 'Desativar' : 'Ativar')}
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
                      <legend className="block text-sm font-medium text-gray-700">Especialidades (opcional)</legend>
                      <div className="mt-2 grid grid-cols-2 gap-2">
                        {[
                          { key: 'Corte', label: 'Corte' },
                          { key: 'Barba', label: 'Barba' },
                          { key: 'Sobrancelha', label: 'Sobrancelha' },
                          { key: 'Combo', label: 'Combo' },
                        ].map((opt) => {
                          const checked = barberForm.especialidades.includes(opt.key);
                          return (
                            <label
                              key={opt.key}
                              className={`flex items-center justify-between rounded-md border px-3 py-2 text-sm cursor-pointer transition-colors ${
                                checked ? 'border-indigo-600 bg-indigo-50' : 'border-gray-300 hover:bg-gray-50'
                              }`}
                            >
                              <span className="font-medium">{opt.label}</span>
                              <input
                                type="checkbox"
                                value={opt.key}
                                checked={checked}
                                onChange={(e) => {
                                  const v = opt.key;
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
                      </div>
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
    </div>
  );
};

export default Dashboard;