import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService } from '../services/api';
import type { BookingResponse } from '../types';

const AppointmentHistory: React.FC = () => {
  const navigate = useNavigate();
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    setError(null);
    try {
      const data = await bookingService.listMine();
      // Filter for past appointments or finalized/cancelled
      const history = (data || []).filter(
        (b) => b.status === 'finalizado' || b.status === 'cancelado' || new Date(`${b.date}T${b.time}`) < new Date()
      );
      setBookings(history);
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar histórico.';
      setError(msg);
    } finally {
      setIsLoading(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const statusMap: Record<string, { label: string; icon: React.ReactNode; className: string }> = {
      finalizado: { 
        label: 'Concluído', 
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

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'completed') return b.status === 'finalizado';
    if (filter === 'cancelled') return b.status === 'cancelado';
    return true;
  });

  const stats = {
    total: bookings.length,
    completed: bookings.filter((b) => b.status === 'finalizado').length,
    cancelled: bookings.filter((b) => b.status === 'cancelado').length,
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
            <div className="grid grid-cols-3 gap-4 mt-6">
            <div className="bg-gray-700/50 rounded-lg p-4 border border-gray-600">
              <div className="text-2xl font-bold text-white mb-1">{stats.total}</div>
              <div className="text-xs text-gray-400 uppercase tracking-wide">Total</div>
            </div>
            <div className="bg-green-500/10 rounded-lg p-4 border border-green-500/30">
              <div className="text-2xl font-bold text-green-400 mb-1">{stats.completed}</div>
              <div className="text-xs text-green-300 uppercase tracking-wide">Concluídos</div>
            </div>
            <div className="bg-red-500/10 rounded-lg p-4 border border-red-500/30">
              <div className="text-2xl font-bold text-red-400 mb-1">{stats.cancelled}</div>
              <div className="text-xs text-red-300 uppercase tracking-wide">Cancelados</div>
            </div>
          </div>
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
              Concluídos ({stats.completed})
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
                  : `Nenhum agendamento ${filter === 'completed' ? 'concluído' : 'cancelado'} encontrado.`}
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
                  className="bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-xl p-6 border border-gray-600 hover:border-amber-500 transition-all shadow-lg hover:shadow-2xl hover:shadow-amber-500/20 hover:-translate-y-1 animate-[fadeInUp_0.6s_ease-out]"
                  style={{ animationDelay: `${index * 0.1}s` }}
                >
                    <div className="flex flex-col md:flex-row md:items-start md:justify-between gap-4">
                      {/* Main Info */}
                      <div className="flex-1">
                      <div className="mb-6">
                        {getStatusBadge(booking.status)}
                        <h3 className="text-xl font-bold text-white mt-2">
                          {booking.service}
                        </h3>
                      </div>                      <div className="grid grid-cols-1 md:grid-cols-2 gap-3 text-sm">
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

                      {/* Evaluation indicator */}
                      {booking.status === 'finalizado' && (
                        <div className="mt-3 flex items-center gap-2 text-sm">
                          <svg className="w-5 h-5 text-yellow-500" fill="currentColor" viewBox="0 0 24 24">
                            <path d="M12 2l3.09 6.26L22 9.27l-5 4.87 1.18 6.88L12 17.77l-6.18 3.25L7 14.14 2 9.27l6.91-1.01L12 2z" />
                          </svg>
                          <span className="text-gray-400">
                            Serviço concluído • Que tal avaliar sua experiência?
                          </span>
                        </div>
                      )}
                    </div>

                    {/* Actions */}
                    {booking.status === 'finalizado' && (
                      <div className="flex md:flex-col gap-2">
                        <button
                          onClick={() => navigate('/booking')}
                          className="relative flex-1 md:flex-initial flex items-center justify-center gap-2 bg-gradient-to-r from-amber-600 to-yellow-600 hover:from-amber-500 hover:to-yellow-500 text-white px-4 py-2 rounded-lg transition-all text-sm font-medium whitespace-nowrap shadow-lg hover:shadow-xl hover:shadow-amber-500/50 hover:-translate-y-0.5 overflow-hidden group"
                        >
                          <svg className="w-4 h-4 group-hover:rotate-90 transition-transform duration-300" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 4v16m8-8H4" />
                          </svg>
                          <span className="relative z-10">Agendar Novamente</span>
                          <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-100%] group-hover:translate-x-[100%] transition-transform duration-700"></div>
                        </button>
                      </div>
                    )}
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
