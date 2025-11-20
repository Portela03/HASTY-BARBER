import React, { useEffect, useState } from 'react';
import { useNavigate, useParams } from 'react-router-dom';
import { bookingService, clearFinalizadosBarbearia, rescheduleService } from '../services/api';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import { formatPhoneBR } from '../utils/phone';
import type { BookingResponse } from '../types';

const BarbershopBookings: React.FC = () => {
  const { id } = useParams();
  const barbershopId = Number(id || 0);
  const navigate = useNavigate();
  const { toasts, removeToast, success, error } = useToast();

  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'pendente' | 'confirmado' | 'cancelado' | 'finalizado'>('all');
  const [clearing, setClearing] = useState(false);
  const [reschedules, setReschedules] = useState<Array<import('../types').RescheduleRequestItem>>([]);

  useEffect(() => {
    loadBookings();
  }, [filter]);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await bookingService.listByBarbershop(barbershopId);
      setBookings(data || []);
      try {
        const rs = await rescheduleService.listByBarbershop(barbershopId);
        setReschedules(rs || []);
      } catch (errRes: any) {
        // non-fatal
      }
    } catch (err: any) {
      error(err?.message || 'Erro ao carregar agendamentos.');
    } finally {
      setIsLoading(false);
    }
  };

  const handleAction = async (idBooking: number, action: 'confirm' | 'cancel' | 'finalize' | 'remove') => {
    try {
      if (action === 'confirm') await bookingService.confirm(idBooking);
      if (action === 'cancel') await bookingService.cancel(idBooking);
      if (action === 'finalize') await bookingService.finalize(idBooking);
      if (action === 'remove') await bookingService.remove(idBooking);
      success('Ação realizada com sucesso.');
      await loadBookings();
    } catch (err: any) {
      error(err?.message || 'Erro ao executar ação.');
    }
  };

  const handleClearAll = async () => {
    if (!confirm('Tem certeza que deseja limpar (marcar como ocultos) os agendamentos finalizados desta barbearia?')) return;
    setClearing(true);
    try {
      // Use the legacy "clear finalized" logic that persists a hidden cutoff on the server
      await clearFinalizadosBarbearia(barbershopId);
      success('Agendamentos finalizados limpos da visualização.');
      await loadBookings();
    } catch (err: any) {
      error(err?.message || 'Erro ao limpar agendamentos.');
    } finally {
      setClearing(false);
    }
  };

  // Counts per status — used in labels
  const counts = {
    all: (bookings || []).filter((b) => b.status !== 'cancelado').length,
    pendente: (bookings || []).filter((b) => b.status === 'pendente').length,
    confirmado: (bookings || []).filter((b) => b.status === 'confirmado').length,
    finalizado: (bookings || []).filter((b) => b.status === 'finalizado').length,
    cancelado: (bookings || []).filter((b) => b.status === 'cancelado').length,
  };

  // Historical behavior: 'Todos' did not include canceled bookings by default.
  const filtered = bookings.filter((b) => {
    if (filter === 'all') return b.status !== 'cancelado';
    return b.status === filter;
  });

  // Centralized status badge renderer (aligned with MyAppointments styling)
  const getStatusBadge = (status: string) => {
    // Solid/clear color variants to match design reference
    const statusMap: Record<string, { label: string; className: string; dotClass?: string }> = {
      pendente: { label: 'Pendente', className: 'bg-amber-500 text-gray-900 border-amber-400 shadow-lg shadow-amber-400/20', dotClass: 'bg-white' },
      confirmado: { label: 'Confirmado', className: 'bg-green-600 text-white border-green-500 shadow-lg shadow-green-500/20', dotClass: 'bg-white' },
      em_andamento: { label: 'Em andamento', className: 'bg-purple-600 text-white border-purple-500 shadow-lg shadow-purple-500/20', dotClass: 'bg-white' },
      cancelado: { label: 'Cancelado', className: 'bg-red-600 text-white border-red-500 shadow-lg shadow-red-500/20', dotClass: 'bg-white' },
      finalizado: { label: 'Finalizado', className: 'bg-gray-600 text-white border-gray-500 shadow-lg shadow-gray-500/20', dotClass: 'bg-white' },
    };
    const config = statusMap[status] || { label: status, className: 'bg-gray-600 text-white border-gray-500', dotClass: 'bg-white' };
    return (
      <span className={`inline-flex items-center gap-2 px-3 py-1.5 rounded-full text-sm font-semibold border ${config.className}`}>
        <span className="capitalize">{config.label}</span>
      </span>
    );
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-5xl mx-auto">
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-visible">
          <div className="relative z-10">
            <button onClick={() => navigate('/dashboard')} className="mb-4 flex items-center gap-2 text-amber-400 group">
              <svg className="w-5 h-5 transition-transform duration-300 group-hover:-translate-x-2" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" /></svg>
              <span className="text-sm font-medium transition-transform duration-300 group-hover:-translate-x-2">Voltar ao Dashboard</span>
            </button>
            <h1 className="text-5xl leading-tight font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-3">Agendamentos da Barbearia</h1>
            <p className="text-gray-300 text-sm">Gerencie os agendamentos recebidos pela sua barbearia</p>
          </div>
        </div>

        <div style={{ animation: 'fadeInUp 420ms ease' }}>
        <div className="bg-gray-800 rounded-xl shadow-lg border border-gray-700 p-4 mb-6">
          <div className="flex flex-wrap gap-2">
            <button
              onClick={() => setFilter('all')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium overflow-hidden group transform transition-transform duration-200 ${filter === 'all' ? 'bg-amber-500 text-gray-900 hover:-translate-y-1' : 'bg-gray-700 text-gray-300 hover:-translate-y-1'}`}
            >
              <span className="relative z-10">Todos ({counts.all})</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button
              onClick={() => setFilter('pendente')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium overflow-hidden group transform transition-transform duration-200 ${filter === 'pendente' ? 'bg-gray-600 text-white hover:-translate-y-1' : 'bg-gray-700 text-gray-300 hover:-translate-y-1'}`}
            >
              <span className="relative z-10">Pendentes ({counts.pendente})</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button
              onClick={() => setFilter('confirmado')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium overflow-hidden group transform transition-transform duration-200 ${filter === 'confirmado' ? 'bg-green-600 text-white hover:-translate-y-1' : 'bg-gray-700 text-gray-300 hover:-translate-y-1'}`}
            >
              <span className="relative z-10">Confirmados ({counts.confirmado})</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button
              onClick={() => setFilter('finalizado')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium overflow-hidden group transform transition-transform duration-200 ${filter === 'finalizado' ? 'bg-gray-600 text-white hover:-translate-y-1' : 'bg-gray-700 text-gray-300 hover:-translate-y-1'}`}
            >
              <span className="relative z-10">Finalizados ({counts.finalizado})</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
            <button
              onClick={() => setFilter('cancelado')}
              className={`relative px-4 py-2 rounded-lg text-sm font-medium overflow-hidden group transform transition-transform duration-200 ${filter === 'cancelado' ? 'bg-red-600 text-white hover:-translate-y-1' : 'bg-gray-700 text-gray-300 hover:-translate-y-1'}`}
            >
              <span className="relative z-10">Cancelados ({counts.cancelado})</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/8 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </div>
          <div className="flex justify-end mt-3">
            <button
              onClick={handleClearAll}
              disabled={clearing}
              className={`relative px-3 py-2 rounded-lg text-sm font-medium transform transition-transform duration-200 ${clearing ? 'bg-gray-600 text-white opacity-70 cursor-not-allowed' : 'bg-red-600 text-white hover:bg-red-700 overflow-hidden group hover:-translate-y-1'}`}
            >
              <span className="relative z-10">{clearing ? 'Apagando...' : 'Limpar agendamentos'}</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
            </button>
          </div>
        </div>

        </div>

        <div style={{ animation: 'fadeInUp 420ms ease' }}>
        <div className="bg-gray-800 rounded-2xl shadow-xl border border-gray-700 p-6">
          {isLoading ? (
            <div className="text-center py-16 text-gray-400">Carregando...</div>
          ) : filtered.length === 0 ? (
            <div className="text-center py-16 text-gray-400">Nenhum agendamento encontrado.</div>
          ) : (
            <div className="space-y-4">
              {filtered.map((b) => {
                const pendingRes = reschedules.find((r) => r.booking_id === b.id && r.status === 'pendente');
                const clientPhone = b.cliente?.telefone ?? (b as any).cliente_telefone ?? (b as any).customer_phone ?? undefined;
                const clientEmail = b.cliente?.email ?? (b as any).cliente_email ?? (b as any).customer_email ?? undefined;
                return (
                  <div key={b.id} className="relative rounded-xl p-6 border border-amber-500/30 hover:shadow-2xl transition-all bg-gradient-to-br from-gray-800/60 via-gray-800 to-gray-900">
                    <div className="flex items-start gap-6">
                        {/* Avatar */}
                        <div className="flex-shrink-0">
                          {(() => {
                            const avatar = b.cliente?.avatar_url ?? (b as any).cliente_avatar_url ?? null;
                            const name = b.cliente?.nome ?? (b as any).cliente_nome ?? 'Cliente';
                            if (avatar) {
                              return <img src={avatar} alt={name} className="w-14 h-14 rounded-full object-cover" />;
                            }
                            return (
                              <div className="w-14 h-14 rounded-full bg-gray-700 flex items-center justify-center text-amber-300">
                                <svg className="w-7 h-7" fill="currentColor" viewBox="0 0 20 20"><path d="M10 10a4 4 0 100-8 4 4 0 000 8zm0 2c-4 0-6 2-6 4v1h12v-1c0-2-2-4-6-4z"/></svg>
                              </div>
                            );
                          })()}
                        </div>

                        {/* Left: content */}
                        <div className="flex-1">
                        <div className="flex items-start justify-between gap-4">
                          <div>
                            {getStatusBadge(b.status)}
                            <h3 className="text-2xl font-extrabold text-white leading-tight mt-3 mb-2">{b.service}</h3>
                          </div>
                        </div>

                        <div className="grid grid-cols-1 md:grid-cols-3 gap-3 text-sm text-gray-300">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V5a2 2 0 00-2-2H5a2 2 0 00-2 2v14a2 2 0 002 2z"/></svg>
                            <span>{b.date}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z"/></svg>
                            <span>{b.time}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z"/></svg>
                            <span>{b.cliente?.nome ?? (b as any).cliente_nome ?? 'Cliente não informado'}</span>
                          </div>
                        </div>

                        <div className="mt-4 text-sm text-gray-300 grid grid-cols-1 md:grid-cols-2 gap-3">
                          <div className="flex items-center gap-2">
                            <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z"/></svg>
                            <span>{clientPhone ? formatPhoneBR(String(clientPhone)) : ''}</span>
                          </div>
                          <div className="flex items-center gap-2">
                            <span>{clientEmail ?? ''}</span>
                          </div>
                        </div>

                        {b.notes && (
                          <div className="mt-4 bg-gray-800 rounded-md p-3 border border-gray-700 text-gray-200">
                            <span className="text-amber-300 font-semibold">Observações:</span> <span className="text-gray-200">{b.notes}</span>
                          </div>
                        )}
                        {pendingRes ? (
                          <div className="mt-3 p-3 bg-yellow-900/40 border border-yellow-700 rounded-md text-sm text-yellow-100">
                            <div className="flex items-center justify-between">
                              <div>
                                <strong>Pedido de reagendamento:</strong> {pendingRes.target_date} {pendingRes.target_time}
                              </div>
                              <div className="flex gap-2">
                                <button
                                  onClick={async () => {
                                    if (!confirm('Aprovar este pedido de reagendamento?')) return;
                                    try {
                                      await rescheduleService.approve(pendingRes.id);
                                      success('Reagendamento aprovado.');
                                      await loadBookings();
                                    } catch (err: any) {
                                      error(err?.message || 'Falha ao aprovar.');
                                    }
                                  }}
                                  className="px-3 py-1 rounded bg-green-600 hover:bg-green-700 text-white text-sm"
                                >
                                  Aprovar
                                </button>
                                <button
                                  onClick={async () => {
                                    if (!confirm('Rejeitar este pedido de reagendamento?')) return;
                                    try {
                                      await rescheduleService.reject(pendingRes.id);
                                      success('Reagendamento rejeitado.');
                                      await loadBookings();
                                    } catch (err: any) {
                                      error(err?.message || 'Falha ao rejeitar.');
                                    }
                                  }}
                                  className="px-3 py-1 rounded bg-red-600 hover:bg-red-700 text-white text-sm"
                                >
                                  Rejeitar
                                </button>
                              </div>
                            </div>
                          </div>
                        ) : null}
                      </div>

                      {/* Right: actions vertical (Finalizar quando confirmado; remover Apagar) */}
                      <div className="flex flex-col items-end gap-3 md:ml-4 ml-auto">
                        {b.status === 'confirmado' && (
                          <button
                            onClick={() => { if (!confirm('Finalizar este agendamento?')) return; handleAction(b.id, 'finalize'); }}
                            className="relative inline-flex items-center justify-center gap-2 w-36 px-4 py-2 bg-amber-500 hover:bg-amber-600 text-gray-900 rounded-md shadow overflow-hidden group"
                          >
                            <span className="relative z-10">
                              <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor"><path fillRule="evenodd" d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879A1 1 0 003.293 9.293l4 4a1 1 0 001.414 0l8-8z" clipRule="evenodd"/></svg>
                              Finalizar
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          </button>
                        )}
                        {b.status === 'pendente' && (
                          <button
                            onClick={() => { if (!confirm('Confirmar este agendamento?')) return; handleAction(b.id, 'confirm'); }}
                            className="relative inline-flex items-center justify-center gap-2 w-36 px-4 py-2 bg-green-600 hover:bg-green-700 text-white rounded-md shadow overflow-hidden group"
                          >
                            <span className="relative z-10">
                              <svg className="w-4 h-4 inline-block mr-1" viewBox="0 0 20 20" fill="currentColor"><path d="M16.707 5.293a1 1 0 00-1.414-1.414L8 11.172 4.707 7.879A1 1 0 003.293 9.293l4 4a1 1 0 001.414 0l8-8z"/></svg>
                              Confirmar
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
                          </button>
                        )}
                        {(b.status === 'pendente' || b.status === 'confirmado') && (
                          <button
                            onClick={() => { if (!confirm('Cancelar este agendamento?')) return; handleAction(b.id, 'cancel'); }}
                            className="relative inline-flex items-center justify-center gap-2 w-36 px-4 py-2 bg-red-600 hover:bg-red-700 text-white rounded-md shadow overflow-hidden group"
                          >
                            <span className="relative z-10">
                              <svg className="w-4 h-4 inline-block mr-1" fill="none" viewBox="0 0 24 24" stroke="currentColor"><path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12"/></svg>
                              Cancelar
                            </span>
                            <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700" />
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
        </div>

        <div className="fixed top-4 right-4 z-50 space-y-2">
          {toasts.map((t, i) => (
            <Toast key={`${t.id}-${i}`} message={t.message} type={t.type} onClose={() => removeToast(t.id)} />
          ))}
        </div>
      </div>
    </div>
  );
};

export default BarbershopBookings;
