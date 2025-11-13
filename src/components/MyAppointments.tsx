import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService, rescheduleService, barberService } from '../services/api';
import type { BookingResponse, Barbeiro } from '../types';

const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  
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
    setError(null);
    try {
      const data = await bookingService.listMine();
      // Filter for upcoming appointments only (not finalized or cancelled)
      const upcoming = (data || []).filter(
        (b) => b.status !== 'finalizado' && b.status !== 'cancelado' && new Date(`${b.date}T${b.time}`) >= new Date()
      );
      setBookings(upcoming);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar agendamentos.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancel = async (id: number) => {
    if (!confirm('Deseja realmente cancelar este agendamento?')) return;
    
    setCancellingId(id);
    try {
      await bookingService.cancel(id);
      alert('Agendamento cancelado com sucesso.');
      loadBookings();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao cancelar agendamento.';
      alert(msg);
    } finally {
      setCancellingId(null);
    }
  };

  const handleOpenReschedule = async (booking: BookingResponse) => {
    if (booking.status !== 'pendente' && booking.status !== 'confirmado') {
      alert('Apenas agendamentos pendentes ou confirmados podem ser reagendados.');
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
      alert('Por favor, informe a data e horário.');
      return;
    }

    const selectedDateTime = new Date(`${rescheduleDate}T${rescheduleTime}`);
    const now = new Date();
    if (selectedDateTime < now) {
      alert('Não é possível reagendar para o passado.');
      return;
    }

    setIsSubmittingReschedule(true);
    try {
      await rescheduleService.create(rescheduleBooking.id, {
        date: rescheduleDate,
        time: rescheduleTime,
        barber_id: rescheduleBarberId ? Number(rescheduleBarberId) : undefined,
      });
      alert('Solicitação de reagendamento enviada com sucesso! Aguarde a aprovação.');
      setShowRescheduleModal(false);
      loadBookings();
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao solicitar reagendamento.';
      alert(msg);
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
            
            <div className="flex items-center justify-between">
              <div>
                <h1 className="text-5xl font-black text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-3 animate-[shimmer_3s_infinite]" style={{ backgroundSize: '200% auto' }}>
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
                className="group flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-5 py-3 rounded-xl transition-all duration-300 disabled:opacity-50 shadow-lg hover:shadow-xl hover:-translate-y-1"
              >
                <svg className={`w-5 h-5 transition-transform ${isLoading ? 'animate-spin' : 'group-hover:rotate-180'} duration-500`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-bold">Atualizar</span>
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
          ) : error ? (
            <div className="bg-red-900/30 border border-red-700 rounded-lg p-6 text-center">
              <svg className="w-12 h-12 text-red-400 mx-auto mb-3" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
              </svg>
              <p className="text-red-300 font-medium">{error}</p>
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
                  className="bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-xl p-6 border border-gray-600 hover:border-amber-500/50 transition-all duration-300 hover:shadow-2xl hover:shadow-amber-500/20 animate-[fadeInUp_0.5s_ease-out] hover:-translate-y-1"
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

                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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
                          <div className="flex items-center gap-2 text-gray-300">
                            <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                            </svg>
                            <span>{booking.barbeiro.nome}</span>
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
                    <div className="flex md:flex-col gap-2">
                      <button
                        onClick={() => handleOpenReschedule(booking)}
                        disabled={booking.status !== 'pendente' && booking.status !== 'confirmado'}
                        className="group flex-1 md:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-gray-900 px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-amber-500/50 hover:-translate-y-0.5 relative overflow-hidden"
                      >
                        <svg className="w-4 h-4 transition-transform group-hover:rotate-180 duration-500" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                        </svg>
                        <span className="relative z-10">Reagendar</span>
                        <div className="absolute inset-0 bg-gradient-to-r from-white/20 to-transparent translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700" />
                      </button>
                      <button
                        onClick={() => handleCancel(booking.id)}
                        disabled={cancellingId === booking.id}
                        className="group flex-1 md:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-red-600 to-red-700 hover:from-red-700 hover:to-red-800 text-white px-4 py-2 rounded-lg transition-all duration-300 text-sm font-bold disabled:opacity-50 disabled:cursor-not-allowed shadow-lg hover:shadow-xl hover:shadow-red-500/50 hover:-translate-y-0.5 relative overflow-hidden"
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
          <div className="relative z-50 w-full max-w-lg bg-gray-800 rounded-2xl shadow-2xl border border-gray-700">
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
    </div>
  );
};

export default MyAppointments;
