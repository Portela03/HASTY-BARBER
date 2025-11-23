import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService, rescheduleService, barberService } from '../services/api';
import type { BookingResponse, Barbeiro } from '../types';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError, warning } = useToast();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [loadError, setLoadError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
  
  // Reschedule modal states
  const [showRescheduleModal, setShowRescheduleModal] = useState(false);
  const [rescheduleBooking, setRescheduleBooking] = useState<BookingResponse | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [rescheduleBarberId, setRescheduleBarberId] = useState<number | ''>('');
  const [availableBarbers, setAvailableBarbers] = useState<Barbeiro[]>([]);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(false);
  const [isSubmittingReschedule, setIsSubmittingReschedule] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    setLoadError(null);
    try {
      const data = await bookingService.listMine();
      // Filter for upcoming appointments only (not finalized or cancelled)
      const upcoming = (data || []).filter(
        (b) => b.status !== 'finalizado' && b.status !== 'cancelado' && new Date(`${b.date}T${b.time}`) >= new Date()
      );
      // Enrich bookings with barber email when missing by fetching barbers for each barbershop
      const shopIds = Array.from(new Set(upcoming.map((b) => b.id_barbearia).filter(Boolean))) as number[];
      const barbersByShop: Record<number, Record<number, any>> = {};
      await Promise.all(
        shopIds.map(async (shopId) => {
          try {
            const barbers = await barberService.listByBarbershop(shopId, { onlyActive: false });
            barbersByShop[shopId] = (barbers || []).reduce((acc: any, br: any) => {
              if (br && (br.id_barbeiro ?? br.id_usuario)) acc[Number(br.id_barbeiro ?? br.id_usuario)] = br;
              return acc;
            }, {} as Record<number, any>);
          } catch (err) {
            // ignore per-shop failures
          }
        })
      );

      const enriched = (upcoming || []).map((b) => {
        try {
          const shopMap = b.id_barbearia ? barbersByShop[Number(b.id_barbearia)] : undefined;
          const bid = b.barber_id ?? b.barbeiro?.id_barbeiro;
          if (shopMap && bid && !((b.barbeiro as any)?.email) && shopMap[Number(bid)]) {
            return { ...b, barbeiro: { ...b.barbeiro, ...(shopMap[Number(bid)] || {}) } };
          }
        } catch (e) {}
        return b;
      });
      setBookings(enriched);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos.';
      setLoadError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const openCancelModal = (id: number) => {
    setBookingToCancel(id);
    setShowCancelModal(true);
  };

  const handleCancel = async () => {
    if (!bookingToCancel) return;
    
    setCancellingId(bookingToCancel);
    setShowCancelModal(false);
    try {
      await bookingService.cancel(bookingToCancel);
      success('Agendamento cancelado com sucesso!');
      loadBookings();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao cancelar agendamento.';
      showError(msg);
    } finally {
      setCancellingId(null);
      setBookingToCancel(null);
    }
  };

  const handleOpenReschedule = async (booking: BookingResponse) => {
    if (booking.status !== 'pendente' && booking.status !== 'confirmado') {
      warning('Apenas agendamentos pendentes ou confirmados podem ser reagendados.');
      return;
    }
    
    setRescheduleBooking(booking);
    setRescheduleDate(booking.date);
    setRescheduleTime(booking.time);
    setRescheduleBarberId(booking.barber_id || '');
    setShowRescheduleModal(true);
    
    // Carregar barbeiros disponíveis
    if (booking.id_barbearia) {
      setIsLoadingBarbers(true);
      try {
        const barbers = await barberService.listByBarbershop(booking.id_barbearia, { onlyActive: true });
        setAvailableBarbers(barbers || []);
      } catch (err) {
        console.error('Erro ao carregar barbeiros:', err);
      } finally {
        setIsLoadingBarbers(false);
      }
    }
  };

  const handleSubmitReschedule = async () => {
    if (!rescheduleBooking) return;
    
    if (!rescheduleDate || !rescheduleTime) {
      warning('Por favor, informe a data e horário.');
      return;
    }

    const selectedDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    const now = new Date();
    if (selectedDateTime < now) {
      warning('Não é possível reagendar para o passado.');
      return;
    }

    setIsSubmittingReschedule(true);
    try {
      await rescheduleService.create(rescheduleBooking.id, {
        date: rescheduleDate,
        time: rescheduleTime,
        barber_id: rescheduleBarberId ? Number(rescheduleBarberId) : undefined,
      });
      success('Solicitação de reagendamento enviada com sucesso! Aguarde a aprovação.');
      setShowRescheduleModal(false);
      loadBookings();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao solicitar reagendamento.';
      showError(msg);
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; className: string; icon: string }> = {
      pendente: { label: 'Pendente', className: 'bg-gradient-to-r from-yellow-500/30 to-yellow-600/30 text-yellow-200 border-yellow-400/60 shadow-lg shadow-yellow-500/20', icon: 'animate-pulse' },
      confirmado: { label: 'Confirmado', className: 'bg-gradient-to-r from-green-500/30 to-emerald-600/30 text-green-200 border-green-400/60 shadow-lg shadow-green-500/20', icon: 'animate-bounce' },
      em_andamento: { label: 'Em andamento', className: 'bg-gradient-to-r from-purple-500/30 to-purple-600/30 text-purple-200 border-purple-400/60 shadow-lg shadow-purple-500/20', icon: 'animate-spin' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gradient-to-r from-gray-500/30 to-gray-600/30 text-gray-300 border-gray-500/60', icon: '' };
    return (
      <span className={`inline-flex items-center gap-1.5 px-3 py-1.5 rounded-full text-xs font-bold border backdrop-blur-sm ${config.className}`}>
        <span className={`h-2 w-2 rounded-full bg-current ${config.icon}`} />
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-hidden animate-[fadeInUp_0.6s_ease-out]">
          <div className="absolute inset-0 bg-gradient-to-r from-amber-500/10 via-transparent to-yellow-500/10 opacity-50" />
          <div className="absolute top-0 right-0 w-64 h-64 bg-amber-500/10 rounded-full blur-3xl" />
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-yellow-500/10 rounded-full blur-3xl" />
          
          <div className="relative z-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="group mb-4 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-all duration-300 hover:-translate-x-1"
            >
              <svg className="w-5 h-5 transition-transform group-hover:-translate-x-1" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-bold">Voltar ao Dashboard</span>
            </button>
            
            <div className="flex flex-col sm:flex-row items-start sm:items-center justify-between gap-4">
              <div>
                <h1 className="text-3xl md:text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-3 animate-[shimmer_3s_infinite]" style={{ backgroundSize: '200% auto' }}>
                  MEUS AGENDAMENTOS
                </h1>
                <p className="text-gray-300 text-base flex items-center gap-2">
                  <span className="h-2 w-2 rounded-full bg-green-500 animate-pulse" />
                  Acompanhe seus próximos agendamentos
                </p>
              </div>
              <button
                onClick={loadBookings}
                disabled={isLoading}
                className="group w-full sm:w-auto flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-4 py-2 md:px-5 md:py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <svg className={`w-5 h-5 transition-transform ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} duration-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm md:text-base font-bold">Atualizar</span>
              </button>
            </div>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gradient-to-br from-gray-700 to-gray-800 rounded-xl p-6 border border-gray-600 animate-pulse">
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="h-6 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-full w-24 animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%' }} />
                      <div className="h-8 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded w-3/4 animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%', animationDelay: '0.2s' }} />
                      <div className="space-y-2">
                        <div className="h-4 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded w-full animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%', animationDelay: '0.4s' }} />
                        <div className="h-4 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded w-5/6 animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%', animationDelay: '0.6s' }} />
                      </div>
                    </div>
                    <div className="space-y-2">
                      <div className="h-10 w-28 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-lg animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%', animationDelay: '0.8s' }} />
                      <div className="h-10 w-28 bg-gradient-to-r from-gray-600 via-gray-500 to-gray-600 rounded-lg animate-[shimmer_2s_infinite]" style={{ backgroundSize: '200% 100%', animationDelay: '1s' }} />
                    </div>
                  </div>
                </div>
              ))}
            </div>
          ) : loadError ? (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 font-medium">{loadError}</p>
            </div>
          ) : bookings.length === 0 ? (
            <div className="text-center py-20 animate-[fadeIn_0.5s_ease-out]">
              <div className="relative inline-block mb-6">
                <svg className="w-24 h-24 text-gray-600 mx-auto animate-[float_3s_ease-in-out_infinite]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                </svg>
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-amber-500 rounded-full animate-ping" />
                <div className="absolute -top-1 -right-1 h-6 w-6 bg-amber-500 rounded-full" />
              </div>
              <h3 className="text-2xl font-bold bg-gradient-to-r from-gray-300 to-gray-500 bg-clip-text text-transparent mb-3">Nenhum agendamento futuro</h3>
              <p className="text-gray-500 mb-8 text-lg">Que tal agendar um serviço agora?</p>
              <button
                onClick={() => navigate('/booking')}
                className="group relative bg-gradient-to-r from-amber-500 to-yellow-600 text-gray-900 px-8 py-4 rounded-xl font-bold hover:from-amber-600 hover:to-yellow-700 transition-all duration-300 shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 hover:-translate-y-1 overflow-hidden"
              >
                <span className="relative z-10 flex items-center gap-2">
                  <svg className="w-5 h-5 animate-bounce" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                  </svg>
                  Agendar Novo Serviço
                </span>
                <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
              </button>
            </div>
          ) : (
                <div className="space-y-4">
              {bookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-xl p-4 md:p-6 border border-gray-600 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 animate-[fadeInUp_0.5s_ease-out] hover:-translate-y-1"
                  style={{ animationDelay: `${index * 0.1}s`, animationFillMode: 'backwards' }}
                >
                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Main Info */}
                    <div className="flex-1">
                      <div className="flex items-start justify-between mb-3">
                        <div>
                          {getStatusBadge(booking.status)}
                          <h3 className="text-xl font-bold text-white mt-4">
                            {booking.service}
                          </h3>
                        </div>
                      </div>

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm md:text-base">
                        {/* Date & Time */}
                        <div className="flex items-center gap-2 text-gray-300">
                          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                          </svg>
                          <span>{formatDate(booking.date)}</span>
                        </div>

                        <div className="flex items-center gap-2 text-gray-300">
                          <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                          </svg>
                          <span>{booking.time}</span>
                        </div>

                        {/* Barber */}
                        {booking.barbeiro && (
                          <div className="flex items-center gap-3 text-gray-300">
                            {booking.barbeiro.avatar_url ? (
                              <img src={booking.barbeiro.avatar_url} alt={booking.barbeiro.nome} className="w-10 h-10 md:w-12 md:h-12 rounded-full object-cover" />
                            ) : (
                              <div className="w-10 h-10 md:w-12 md:h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold">
                                {String(booking.barbeiro.nome || '').charAt(0).toUpperCase()}
                              </div>
                            )}
                            <div className="flex-1 min-w-0">
                              <div className="flex items-center justify-between gap-3">
                                <span className="text-sm md:text-base font-semibold text-white truncate">{booking.barbeiro.nome}</span>
                              </div>
                              <div className="text-xs md:text-sm text-gray-400 flex flex-col sm:flex-row sm:items-center sm:gap-3 mt-1">
                                {(booking.barbeiro as any)?.email && (
                                  <span className="flex items-center gap-1 truncate">
                                    <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m0 0v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8m18 0L12 13 3 8" />
                                    </svg>
                                    <span className="truncate">{(booking.barbeiro as any).email}</span>
                                  </span>
                                )}
                              </div>
                            </div>
                          </div>
                        )}

                        {/* Barbershop */}
                        {booking.barbearia && (
                          <div className="flex items-center gap-2 text-gray-300">
                            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                            </svg>
                            <span>{booking.barbearia.nome}</span>
                          </div>
                        )}
                      </div>

                      {/* Notes */}
                      {booking.notes && (
                        <div className="mt-3 bg-gray-800 rounded-lg p-3">
                          <p className="text-sm text-gray-400">
                            <span className="font-semibold text-amber-400">Observações:</span> {booking.notes}
                          </p>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    <div className="flex flex-col sm:flex-row md:flex-col gap-2">
                      <button
                        onClick={() => handleOpenReschedule(booking)}
                        disabled={booking.status !== 'pendente' && booking.status !== 'confirmado'}
                        className="group w-full sm:flex-1 md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-gray-900 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-amber-500/50 hover:-translate-y-0.5 relative overflow-hidden"
                      >
                        <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="relative z-10">Reagendar</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </button>
                      <button
                        onClick={() => openCancelModal(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="group w-full sm:flex-1 md:w-auto flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-red-500/50 hover:-translate-y-0.5 relative overflow-hidden"
                      >
                        {cancellingId === booking.id ? (
                          <>
                            <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                            Cancelando...
                          </>
                        ) : (
                          <>
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                            </svg>
                            Cancelar
                          </>
                        )}
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>

      {/* Reschedule Modal */}
      {showRescheduleModal && rescheduleBooking && (
        <div className="fixed inset-0 z-50 flex items-center justify-center">
          <div className="fixed inset-0 bg-black/60" onClick={() => setShowRescheduleModal(false)} aria-hidden />
          <div className="relative z-50 w-full max-w-full sm:max-w-lg bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
            {/* Header */}
            <div className="bg-gradient-to-r from-amber-500 to-yellow-600 rounded-t-2xl p-6">
              <div className="flex items-center justify-between">
                <div>
                  <h3 className="text-xl font-bold text-gray-900 mb-1">Reagendar Serviço</h3>
                  <p className="text-gray-800 text-sm">{rescheduleBooking.service}</p>
                </div>
                <button
                  onClick={() => setShowRescheduleModal(false)}
                  className="text-gray-900/70 hover:text-gray-900 transition-colors"
                  aria-label="Fechar"
                >
                  <svg className="w-6 h-6" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                </button>
              </div>
            </div>

            {/* Content */}
            <div className="p-6 space-y-6">
              {/* Current booking info */}
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <p className="text-sm text-gray-400 mb-2">Agendamento atual:</p>
                <div className="flex items-center gap-4 text-sm text-white">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                    </svg>
                    <span>{new Date(rescheduleBooking.date + 'T00:00:00').toLocaleDateString('pt-BR')}</span>
                  </div>
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <span>{rescheduleBooking.time}</span>
                  </div>
                </div>
              </div>

              {/* New date and time */}
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Nova Data</label>
                    <input
                      type="date"
                      value={rescheduleDate}
                      onChange={(e) => setRescheduleDate(e.target.value)}
                      min={new Date().toISOString().split('T')[0]}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                  <div>
                    <label className="block text-sm font-medium text-gray-300 mb-2">Novo Horário</label>
                    <input
                      type="time"
                      value={rescheduleTime}
                      onChange={(e) => setRescheduleTime(e.target.value)}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    />
                  </div>
                </div>

                {/* Barber selection (optional) */}
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">
                    Barbeiro (opcional - deixe vazio para manter o mesmo)
                  </label>
                  {isLoadingBarbers ? (
                    <div className="text-sm text-gray-400 py-2">Carregando barbeiros...</div>
                  ) : (
                    <select
                      value={rescheduleBarberId}
                      onChange={(e) => setRescheduleBarberId(e.target.value ? Number(e.target.value) : '')}
                      className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                    >
                      <option value="">Manter barbeiro atual</option>
                      {availableBarbers.map((barber) => (
                        <option key={barber.id_barbeiro} value={barber.id_barbeiro}>
                          {barber.nome}
                        </option>
                      ))}
                    </select>
                  )}
                </div>
              </div>

              {/* Info alert */}
              <div className="bg-amber-500/10 border border-amber-500/30 rounded-lg p-4">
                <div className="flex gap-3">
                  <svg className="w-5 h-5 text-amber-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M13 16h-1v-4h-1m1-4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                  </svg>
                  <p className="text-sm text-amber-200">
                    Sua solicitação será enviada para aprovação. Você será notificado quando o barbeiro aprovar o reagendamento.
                  </p>
                </div>
              </div>
            </div>

            {/* Footer */}
            <div className="bg-gray-700/30 rounded-b-2xl p-6 flex items-center justify-end gap-3">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="px-6 py-2.5 rounded-lg border border-gray-600 text-gray-300 hover:bg-gray-700 transition-colors font-medium"
              >
                Cancelar
              </button>
              <button
                onClick={handleSubmitReschedule}
                disabled={isSubmittingReschedule || !rescheduleDate || !rescheduleTime}
                className="px-6 py-2.5 rounded-lg bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-gray-900 font-semibold transition-all disabled:opacity-50 disabled:cursor-not-allowed flex items-center gap-2"
              >
                {isSubmittingReschedule ? (
                  <>
                    <div className="animate-spin rounded-full h-4 w-4 border-b-2 border-white" />
                    Enviando...
                  </>
                ) : (
                  'Solicitar Reagendamento'
                )}
              </button>
            </div>
          </div>
        </div>
      )}

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

      {/* Modal de Confirmação de Cancelamento */}
      {showCancelModal && (
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
              Tem certeza que deseja cancelar este agendamento? Esta ação não poderá ser desfeita.
            </p>

            {/* Botões */}
            <div className="flex gap-3">
              <button
                onClick={() => {
                  setShowCancelModal(false);
                  setBookingToCancel(null);
                }}
                className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Não, manter
              </button>
              <button
                onClick={handleCancel}
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

export default MyAppointments;
