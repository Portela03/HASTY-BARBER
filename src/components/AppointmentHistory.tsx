import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService, evaluationService } from '../services/api';
import { formatPhoneBR } from '../utils/phone';
import { useToast } from '../hooks/useToast';
import type { BookingResponse } from '../types';

const AppointmentHistory: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  const { success: showSuccess, error: showError } = useToast();

  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewTarget, setReviewTarget] = useState<'barbeiro' | 'barbearia'>('barbeiro');
  const [allowedTargets, setAllowedTargets] = useState<Array<'barbeiro' | 'barbearia'>>(['barbeiro', 'barbearia']);
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await bookingService.listMine();
      // Include all bookings in history (finalizados + cancelados + others)
      setBookings(data || []);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar histórico.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const openReview = async (bookingId: number) => {
    // Re-validate booking ownership and status (backend rules)
    try {
      const mine = await bookingService.listMine();
      const booking = (mine || []).find((b) => b.id === bookingId);
      if (!booking) {
        showError('Agendamento não encontrado ou você não é o dono deste agendamento.');
        return;
      }
      if (booking.status !== 'finalizado') {
        showError('Só é possível avaliar após a finalização do atendimento.');
        return;
      }
      // Allowed targets: barbearia always allowed, barbeiro only if booking.barbeiro present
      const targets: Array<'barbeiro' | 'barbearia'> = ['barbearia'];
      if (booking.barbeiro && (booking.barbeiro as any).id_barbeiro) targets.unshift('barbeiro');
      setAllowedTargets(targets);
      setReviewTarget(targets[0]);
      setReviewBookingId(bookingId);
      setReviewRating(0);
      setReviewComment('');
      setShowReviewModal(true);
    } catch (err: any) {
      const msg = err?.message || 'Erro ao validar agendamento.';
      showError(msg);
    }
  };

  const submitReview = async () => {
    if (!reviewBookingId) return;
    setIsSubmittingReview(true);
    try {
      if (!Number.isInteger(reviewRating) || reviewRating < 1 || reviewRating > 5) {
        showError('Escolha uma nota entre 1 e 5.');
        return;
      }
      if (reviewComment && reviewComment.length > 1000) {
        showError('O comentário deve ter no máximo 1000 caracteres.');
        return;
      }
      await evaluationService.create({ id_booking: reviewBookingId, target: reviewTarget, rating: reviewRating, comentario: reviewComment });
      showSuccess('Avaliação enviada com sucesso.');
      setShowReviewModal(false);
      // Refresh bookings and optionally refresh review aggregates
      await loadBookings();
      try {
        const booking = bookings.find((b) => b.id === reviewBookingId);
        if (booking?.barbeiro && (booking.barbeiro as any).id_barbeiro) {
          await evaluationService.listByBarber((booking.barbeiro as any).id_barbeiro);
        }
        if (booking?.id_barbearia) {
          await evaluationService.listByBarbershop(booking.id_barbearia);
        }
      } catch {
        // ignore refresh failures
      }
    } catch (err: any) {
      const status = err?.status ?? err?.response?.status;
      if (status === 409) {
        showError('Já existe avaliação para este agendamento.');
        setShowReviewModal(false);
        return;
      }
      const msg = err?.response?.data?.message || err?.message || 'Erro ao enviar avaliação.';
      showError(msg);
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      finalizado: { 
        label: 'Finalizado', 
        icon: <span className="inline-block w-1.5 h-1.5 bg-green-400 rounded-full animate-pulse"></span>,
        className: 'bg-gradient-to-r from-green-500/30 to-green-600/30 text-green-300 border-green-500/50 backdrop-blur-sm' 
      },
      cancelado: { 
        label: 'Cancelado', 
        icon: <span className="inline-block w-1.5 h-1.5 bg-red-400 rounded-full animate-bounce"></span>,
        className: 'bg-gradient-to-r from-red-500/30 to-red-600/30 text-red-300 border-red-500/50 backdrop-blur-sm' 
      },
      pendente: { 
        label: 'Expirado', 
        icon: <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>,
        className: 'bg-gradient-to-r from-gray-500/30 to-gray-600/30 text-gray-300 border-gray-500/50 backdrop-blur-sm' 
      },
      confirmado: { 
        label: 'Expirado', 
        icon: <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>,
        className: 'bg-gradient-to-r from-gray-500/30 to-gray-600/30 text-gray-300 border-gray-500/50 backdrop-blur-sm' 
      },
    };
    const config = statusMap[status] || { 
      label: status, 
      icon: <span className="inline-block w-1.5 h-1.5 bg-gray-400 rounded-full"></span>,
      className: 'bg-gradient-to-r from-gray-500/30 to-gray-600/30 text-gray-300 border-gray-500/50 backdrop-blur-sm' 
    };
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1 rounded-full text-xs font-semibold border ${config.className}`}>
        {config.icon}
        {config.label}
      </span>
    );
  };

  const formatDate = (dateStr: string) => {
    const date = new Date(dateStr + 'T00:00:00');
    return date.toLocaleDateString('pt-BR', { day: '2-digit', month: 'long', year: 'numeric' });
  };

  // Parse booking date+time robustly for sorting (time may be 'HH:MM')
  const parseDateTime = (dateStr?: string, timeStr?: string) => {
    if (!dateStr) return new Date(0);
    const time = timeStr ? (timeStr.length === 5 ? `${timeStr}:00` : timeStr) : '00:00:00';
    return new Date(`${dateStr}T${time}`);
  };

  // Exclude expired bookings (pendente, confirmado) from lists and stats
  const visibleBookings = bookings.filter((b) => b.status !== 'pendente' && b.status !== 'confirmado');

  const filteredBookings = (() => {
    if (filter === 'completed') {
      return visibleBookings
        .filter((b) => b.status === 'finalizado')
        .sort((a, b) => parseDateTime(b.date, b.time).getTime() - parseDateTime(a.date, a.time).getTime());
    }
    if (filter === 'cancelled') {
      return visibleBookings
        .filter((b) => b.status === 'cancelado')
        .sort((a, b) => parseDateTime(b.date, b.time).getTime() - parseDateTime(a.date, a.time).getTime());
    }
    // 'all' includes visible bookings and shows finalized first, then others by date desc
    return [...visibleBookings].sort((a, b) => {
      const pa = a.status === 'finalizado' ? 0 : 1;
      const pb = b.status === 'finalizado' ? 0 : 1;
      if (pa !== pb) return pa - pb;
      return parseDateTime(b.date, b.time).getTime() - parseDateTime(a.date, a.time).getTime();
    });
  })();

  const stats = {
    total: visibleBookings.length,
    completed: visibleBookings.filter((b) => b.status === 'finalizado').length,
    cancelled: visibleBookings.filter((b) => b.status === 'cancelado').length,
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-hidden">
          {/* Decorative gradient circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-yellow-500/10 to-amber-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-4 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-all hover:-translate-x-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Voltar ao Dashboard</span>
            </button>
            
            <div className="flex flex-col md:flex-row md:items-center md:justify-between gap-4">
              <div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-2 animate-[shimmer_5s_infinite] bg-[length:200%_auto]">
                  HISTÓRICO DE AGENDAMENTOS
                </h1>
                <p className="text-gray-300 text-sm">
                  Visualize todos os seus agendamentos anteriores
                </p>
              </div>
              <button
                onClick={loadBookings}
                disabled={isLoading}
                className="flex items-center gap-2 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white px-4 py-2 rounded-lg transition-all shadow-lg hover:shadow-xl disabled:opacity-50 self-start md:self-auto"
              >
                <svg className={`w-5 h-5 ${isLoading ? 'animate-spin' : ''}`} fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582m15.356 2A8.001 8.001 0 004.582 9m0 0H9m11 11v-5h-.581m0 0a8.003 8.003 0 01-15.357-2m15.357 2H15" />
                </svg>
                <span className="text-sm font-medium">Atualizar</span>
              </button>
            </div>

            {/* Stats */}
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4 mt-6">
              <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
                <div className="text-2xl font-bold text-white mb-1">{stats.total}</div>
                <div className="text-xs text-gray-400 uppercase tracking-wide">Total</div>
              </div>

              <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
                <div className="text-2xl font-bold text-green-400 mb-1">{stats.completed}</div>
                <div className="text-xs text-green-300 uppercase tracking-wide">Finalizados</div>
              </div>

              <div className="bg-red-600/10 rounded-lg p-4 border border-red-500/30">
                <div className="text-2xl font-bold text-red-400 mb-1">{stats.cancelled}</div>
                <div className="text-xs text-red-300 uppercase tracking-wide">Cancelados</div>
              </div>
            </div>
            {showReviewModal && (
              <div className="fixed inset-0 z-50 flex items-center justify-center px-4">
                <div className="absolute inset-0 bg-black/60 backdrop-blur-sm" onClick={() => setShowReviewModal(false)} />
                <div className="relative bg-gradient-to-br from-gray-900/95 to-gray-800 rounded-2xl p-6 w-full max-w-2xl mx-auto border border-gray-700 shadow-2xl transform transition-transform duration-200 scale-100">
                  <div className="flex items-start gap-4">
                    <div className="flex-1">
                      <h3 className="text-xl font-bold text-white">Avaliar atendimento</h3>
                      <p className="text-sm text-gray-400 mt-1">Compartilhe sua experiência e ajude outros clientes.</p>
                    </div>
                    <button onClick={() => setShowReviewModal(false)} className="text-gray-400 hover:text-gray-200">
                      <svg className="w-6 h-6" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                    </button>
                  </div>

                  {/* booking context */}
                  {(() => {
                    const b = bookings.find((x) => x.id === reviewBookingId);
                    return (
                      <div className="mt-4 bg-gray-800/40 border border-gray-700 rounded-lg p-3 flex flex-col sm:flex-row sm:items-center gap-3">
                        <div className="flex items-center gap-3">
                          <div className="w-16 h-16 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                            {b?.barbeiro?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={b.barbeiro.avatar_url} alt={b.barbeiro.nome} className="w-16 h-16 object-cover" />
                            ) : (
                              <span className="text-gray-300 font-semibold">{b?.barbeiro?.nome ? b.barbeiro.nome.charAt(0).toUpperCase() : (b?.barbearia?.nome ? b.barbearia.nome.charAt(0).toUpperCase() : '?')}</span>
                            )}
                          </div>
                        </div>
                        <div className="flex-1">
                          <div className="text-sm text-gray-300 font-semibold">{b?.service}</div>
                          <div className="text-xs text-gray-400">{b ? `${formatDate(b.date)} • ${b.time}` : ''}</div>
                          <div className="text-sm text-gray-300 mt-2">{b?.barbearia?.nome}</div>
                          <div className="mt-2 text-sm text-gray-400 space-y-1">
                            {/* email removed to avoid rendering issues */}
                            {b?.barbeiro?.telefone && <div>Telefone: <span className="text-gray-200">{formatPhoneBR(String(b.barbeiro.telefone))}</span></div>}
                            {!b?.barbeiro && b?.barbearia && <div className="text-gray-400">Avaliação direcionada à barbearia</div>}
                          </div>
                        </div>
                      </div>
                    );
                  })()}

                  {/* target selector */}
                  <div className="mt-4 flex items-center gap-3">
                    <div className="text-sm text-gray-300 font-medium">Avaliar como:</div>
                    <div className="flex items-center gap-2">
                      <button
                        onClick={() => allowedTargets.includes('barbeiro') && setReviewTarget('barbeiro')}
                        disabled={!allowedTargets.includes('barbeiro')}
                        className={`px-3 py-1 rounded-full text-sm ${reviewTarget === 'barbeiro' ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-300'} ${!allowedTargets.includes('barbeiro') ? 'opacity-50 cursor-not-allowed' : 'hover:bg-gray-700'}`}
                      >
                        Barbeiro
                      </button>
                      <button
                        onClick={() => setReviewTarget('barbearia')}
                        className={`px-3 py-1 rounded-full text-sm ${reviewTarget === 'barbearia' ? 'bg-amber-500 text-gray-900' : 'bg-gray-800 text-gray-300'} hover:bg-gray-700`}
                      >
                        Barbearia
                      </button>
                    </div>
                  </div>

                  <div className="mt-4 grid grid-cols-1 md:grid-cols-2 gap-4">
                    <div>
                      <div className="text-sm text-gray-300 mb-2">Avaliar</div>
                      <div className="flex items-center gap-2">
                        {[1,2,3,4,5].map((n) => (
                          <button
                            key={n}
                            onClick={() => setReviewRating(n)}
                            aria-label={`${n} estrelas`}
                            className={`p-2 rounded-full transition-all ${reviewRating >= n ? 'bg-yellow-400 text-gray-900 scale-105' : 'bg-gray-800 text-gray-300 hover:bg-gray-700'}`}>
                            <svg className={`w-6 h-6 ${reviewRating >= n ? 'fill-current text-yellow-400' : 'text-gray-400'}`} viewBox="0 0 24 24" fill={reviewRating >= n ? 'currentColor' : 'none'} stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={1.2} d="M12 17.27L18.18 21l-1.64-7.03L22 9.24l-7.19-.61L12 2 9.19 8.63 2 9.24l5.46 4.73L5.82 21z" />
                            </svg>
                          </button>
                        ))}
                      </div>
                    </div>

                    <div>
                      <div className="text-sm text-gray-300 mb-2">Comentário (opcional)</div>
                      <textarea
                        value={reviewComment}
                        onChange={(e) => setReviewComment(e.target.value)}
                        placeholder="Conte como foi o atendimento (máx. 1000 caracteres)"
                        className="w-full min-h-[96px] bg-gray-800 border border-gray-700 rounded-lg p-3 text-gray-200 resize-vertical"
                        maxLength={1000}
                      />
                      <div className="text-xs text-gray-400 mt-2 text-right">{reviewComment.length}/1000</div>
                    </div>
                  </div>

                  <div className="mt-6 flex items-center justify-end gap-3">
                    <button onClick={() => setShowReviewModal(false)} className="px-4 py-2 rounded-lg bg-gray-700 text-gray-300">Cancelar</button>
                    <button
                      onClick={submitReview}
                      disabled={isSubmittingReview || reviewRating === 0}
                      className={`px-4 py-2 rounded-lg font-semibold ${reviewRating === 0 || isSubmittingReview ? 'bg-amber-300 text-gray-700 cursor-not-allowed' : 'bg-amber-500 text-gray-900 hover:from-amber-400 hover:to-amber-600'}`}>
                      {isSubmittingReview ? (
                        <span className="flex items-center gap-2">
                          <svg className="w-4 h-4 animate-spin" viewBox="0 0 24 24" fill="none" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M4 4v5h.582"/></svg>
                          Enviando...
                        </span>
                      ) : (
                        'Enviar Avaliação'
                      )}
                    </button>
                  </div>
                </div>
              </div>
            )}
          </div>
        </div>

        {/* Filters */}
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'all'
                  ? 'bg-amber-500 text-gray-900'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Todos ({stats.total})
            </button>
            <button
              onClick={() => setFilter('completed')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'completed'
                  ? 'bg-green-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Finalizados ({stats.completed})
            </button>
            <button
              onClick={() => setFilter('cancelled')}
              className={`px-4 py-2 rounded-lg text-sm font-medium transition-all ${
                filter === 'cancelled'
                  ? 'bg-red-600 text-white'
                  : 'bg-gray-700 text-gray-300 hover:bg-gray-600'
              }`}
            >
              Cancelados ({stats.cancelled})
            </button>
          </div>
        </div>

        {/* Content */}
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6">
          {isLoading ? (
            <div className="space-y-4">
              {[1, 2, 3].map((i) => (
                <div key={i} className="bg-gray-700 rounded-xl p-6 border border-gray-600 animate-[fadeInUp_0.6s_ease-out]" style={{ animationDelay: `${i * 0.1}s` }}>
                  <div className="flex items-start justify-between gap-4">
                    <div className="flex-1 space-y-3">
                      <div className="h-6 w-32 bg-gradient-to-r from-gray-600 to-gray-500 rounded-full animate-[shimmer_2s_infinite] bg-[length:200%_auto]" style={{ animationDelay: `${i * 0.2}s` }} />
                      <div className="h-8 bg-gradient-to-r from-gray-600 to-gray-500 rounded animate-[shimmer_2s_infinite] bg-[length:200%_auto]" style={{ animationDelay: `${i * 0.3}s` }} />
                      <div className="grid grid-cols-2 gap-3">
                        <div className="h-5 bg-gradient-to-r from-gray-600 to-gray-500 rounded animate-[shimmer_2s_infinite] bg-[length:200%_auto]" style={{ animationDelay: `${i * 0.4}s` }} />
                        <div className="h-5 bg-gradient-to-r from-gray-600 to-gray-500 rounded animate-[shimmer_2s_infinite] bg-[length:200%_auto]" style={{ animationDelay: `${i * 0.5}s` }} />
                      </div>
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
          ) : filteredBookings.length === 0 ? (
            <div className="text-center py-20">
              <div className="inline-block animate-[float_3s_ease-in-out_infinite]">
                <svg className="w-20 h-20 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
                </svg>
              </div>
              <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-500 mb-2">Nenhum registro encontrado</h3>
              <p className="text-gray-500 mb-6">
                {filter === 'all'
                  ? 'Você ainda não possui histórico de agendamentos.'
                  : 'Nenhum agendamento finalizado encontrado.'}
              </p>
              {filter !== 'all' && (
                <button
                  onClick={() => setFilter('all')}
                  className="relative inline-flex items-center gap-2 px-6 py-3 bg-gradient-to-r from-amber-600 to-yellow-600 text-white rounded-lg font-semibold transition-all hover:from-amber-500 hover:to-yellow-500 hover:shadow-xl hover:shadow-amber-500/50 hover:-translate-y-0.5 overflow-hidden group"
                >
                  <span className="relative z-10">Ver todos</span>
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                </button>
              )}
            </div>
          ) : (
            <div className="space-y-4">
              {filteredBookings.map((booking, index) => (
                <div
                  key={booking.id}
                  className="relative bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-xl p-6 border border-gray-600 hover:border-amber-500 transition-all shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1 animate-[fadeInUp_0.6s_ease-out]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                  {/* Status badge: mobile (inline) + desktop (absolute top-left) */}
                  {/* mobile badge removed to avoid duplication; status rendered in the left column for all sizes */}

                  <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                    {/* Left: status (top), info (right of status) and photo (below status on desktop) */}
                    <div className="w-full md:w-2/3">
                      <div className="flex flex-col md:flex-row md:items-start gap-4">
                        {/* Desktop column: status on top and photo below */}
                        <div className="hidden md:flex md:flex-col items-start w-28 flex-shrink-0">
                          <div className="mb-2">{getStatusBadge(booking.status)}</div>
                          <div className="mt-4 w-16 h-16 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center">
                            {booking.barbeiro?.avatar_url ? (
                              // eslint-disable-next-line @next/next/no-img-element
                              <img src={booking.barbeiro.avatar_url} alt={booking.barbeiro.nome} className="w-full h-full object-cover" />
                            ) : (
                              <span className="text-gray-300 font-semibold">{booking.barbeiro?.nome ? booking.barbeiro.nome.charAt(0).toUpperCase() : booking.barbearia?.nome ? booking.barbearia.nome.charAt(0).toUpperCase() : '?'}</span>
                            )}
                          </div>
                        </div>

                        {/* Info area (next to status on desktop, full width on mobile) */}
                        <div className="flex-1">
                          <div className="flex items-start gap-4">
                            {/* Mobile avatar (shown next to info on small screens) */}
                            <div className="md:hidden w-12 h-12 rounded-full bg-gray-700 overflow-hidden flex items-center justify-center flex-shrink-0">
                              {booking.barbeiro?.avatar_url ? (
                                // eslint-disable-next-line @next/next/no-img-element
                                <img src={booking.barbeiro.avatar_url} alt={booking.barbeiro.nome} className="w-full h-full object-cover" />
                              ) : (
                                <span className="text-gray-300 font-semibold">{booking.barbeiro?.nome ? booking.barbeiro.nome.charAt(0).toUpperCase() : booking.barbearia?.nome ? booking.barbearia.nome.charAt(0).toUpperCase() : '?'}</span>
                              )}
                            </div>
                            <div className="flex-1">
                              <h3 className="text-xl font-bold text-white">{booking.service}</h3>
                              <div className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3M3 11h18M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                                </svg>
                                <span>{formatDate(booking.date)} • {booking.time}</span>
                              </div>

                              <div className="text-sm text-gray-300 mt-1 flex items-center gap-2">
                                <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 7a2 2 0 012-2h14a2 2 0 012 2v10a2 2 0 01-2 2H5a2 2 0 01-2-2V7z" />
                                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7v10M16 7v10" />
                                </svg>
                                <span>{booking.barbearia?.nome}</span>
                              </div>

                              <div className="mt-2 text-sm text-gray-400 space-y-1">
                                {/* email removed to avoid rendering issues */}
                                {booking.barbeiro?.telefone && (
                                  <div className="flex items-center gap-2">
                                    <svg className="w-4 h-4 text-gray-400 flex-shrink-0" viewBox="0 0 24 24" fill="none" stroke="currentColor">
                                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.6a1 1 0 01.97.757l.72 3.218a1 1 0 01-.27.92L8.4 12.6a11.042 11.042 0 005.0 5.0l2.7-1.6a1 1 0 01.92-.27l3.218.72A1 1 0 0121 17.4V21a2 2 0 01-2 2H5a2 2 0 01-2-2V5z" />
                                    </svg>
                                    <div>Tel: <span className="text-gray-200">{formatPhoneBR(String(booking.barbeiro.telefone))}</span></div>
                                  </div>
                                )}
                              </div>
                            </div>
                          </div>
                        </div>
                      </div>
                    </div>

                    {/* Right: notes + actions */}
                    <div className="w-full md:w-1/3">
                      {/* Notes */}
                      {booking.notes && (
                        <div className="mt-1 bg-gray-800 rounded-lg p-3">
                          <p className="text-sm text-gray-400">
                            <span className="font-semibold text-amber-400">Observações:</span> {booking.notes}
                          </p>
                        </div>
                      )}

                      {/* Evaluation indicator */}
                      {booking.status === 'finalizado' && (
                        <div className="mt-3 flex items-center gap-2 text-sm text-gray-400">
                          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span>
                            Serviço concluído • Que tal avaliar sua experiência?
                          </span>
                        </div>
                      )}

                      {/* Actions */}
                      {booking.status === 'finalizado' && !showReviewModal && (
                        <div className="mt-4 flex flex-col sm:flex-row sm:justify-end gap-2">
                          <button
                            onClick={() => navigate('/booking')}
                            className="w-full sm:w-auto relative flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium whitespace-nowrap shadow-lg hover:shadow-xl hover:shadow-amber-500/50 hover:-translate-y-0.5 overflow-hidden group"
                          >
                            <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                            </svg>
                            <span className="relative z-10">Agendar Novamente</span>
                          </button>
                          <button
                            onClick={() => openReview(booking.id)}
                            className="w-full sm:w-auto relative flex items-center justify-center gap-2 bg-gradient-to-r from-yellow-500 to-amber-600 hover:from-yellow-400 hover:to-amber-500 text-gray-900 px-4 py-2 rounded-lg transition-all text-sm font-medium whitespace-nowrap shadow-lg hover:shadow-xl hover:shadow-amber-500/30 hover:-translate-y-0.5 overflow-hidden group"
                          >
                            <svg className="w-4 h-4" fill="currentColor" viewBox="0 0 24 24">
                              <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                            </svg>
                            <span className="relative z-10">Avaliar</span>
                          </button>
                        </div>
                      )}
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      </div>
    </div>
  );
};

export default AppointmentHistory;
