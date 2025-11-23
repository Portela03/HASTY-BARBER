import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService, rescheduleService, barberService } from '../services/api';
import type { BookingResponse, Barbeiro, ApiErrorResponse } from '../types';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';
import { ConfirmationModal } from './common/ConfirmationModal';

const MyAppointments: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, success, error: showError } = useToast();
  
  // States
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [cancellingId, setCancellingId] = useState<number | null>(null);
  const [showCancelModal, setShowCancelModal] = useState(false);
  const [bookingToCancel, setBookingToCancel] = useState<number | null>(null);
  
  // Reschedule states
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
    try {
      const data = await bookingService.listMine();
      const upcoming = (data || []).filter(
        (b) => b.status !== 'finalizado' && b.status !== 'cancelado' && 
        new Date(`${b.date}T${b.time}`) >= new Date()
      );
      setBookings(upcoming);
    } catch (err: unknown) {
      const error = err as ApiErrorResponse;
      showError(error?.response?.data?.message || error.message || 'Erro ao carregar agendamentos');
    } finally {
      setIsLoading(false);
    }
  };

  const handleCancelClick = (bookingId: number) => {
    setBookingToCancel(bookingId);
    setShowCancelModal(true);
  };

  const confirmCancel = async () => {
    if (bookingToCancel === null) return;
    setCancellingId(bookingToCancel);
    try {
      await bookingService.cancel(bookingToCancel);
      success('Agendamento cancelado com sucesso!');
      setShowCancelModal(false);
      loadBookings();
    } catch (err: unknown) {
      const error = err as ApiErrorResponse;
      showError(error?.response?.data?.message || error.message || 'Erro ao cancelar agendamento');
    } finally {
      setCancellingId(null);
      setBookingToCancel(null);
    }
  };

  const handleRescheduleClick = async (booking: BookingResponse) => {
    setRescheduleBooking(booking);
    setRescheduleDate(booking.date);
    setRescheduleTime(booking.time);
    setRescheduleBarberId(booking.barbeiro?.id_barbeiro || '');
    setShowRescheduleModal(true);
    
    if (booking.id_barbearia) {
      setIsLoadingBarbers(true);
      try {
        const barbers = await barberService.listByBarbershop(booking.id_barbearia, { onlyActive: true });
        setAvailableBarbers(barbers || []);
      } catch (err) {
        showError('Erro ao carregar barbeiros');
      } finally {
        setIsLoadingBarbers(false);
      }
    }
  };

  const submitReschedule = async () => {
    if (!rescheduleBooking || !rescheduleDate || !rescheduleTime || !rescheduleBarberId) {
      showError('Preencha todos os campos');
      return;
    }

    setIsSubmittingReschedule(true);
    try {
      await rescheduleService.create(rescheduleBooking.id, {
        date: rescheduleDate,
        time: rescheduleTime,
        barber_id: Number(rescheduleBarberId),
      });
      success('Solicitação de reagendamento enviada!');
      setShowRescheduleModal(false);
      loadBookings();
    } catch (err: unknown) {
      const error = err as ApiErrorResponse;
      showError(error?.response?.data?.message || error.message || 'Erro ao reagendar');
    } finally {
      setIsSubmittingReschedule(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      confirmado: 'bg-green-500/20 text-green-400 border-green-500/30',
      em_andamento: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusText = (status: string) => {
    const texts = {
      pendente: 'Pendente',
      confirmado: 'Confirmado',
      em_andamento: 'Em Andamento',
    };
    return texts[status as keyof typeof texts] || status;
  };

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black">
      {/* Header */}
      <div className="sticky top-0 z-40 bg-gray-900/80 backdrop-blur-lg border-b border-gray-800">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-4">
          <div className="flex items-center justify-between">
            <button
              onClick={() => navigate('/dashboard')}
              className="flex items-center text-gray-400 hover:text-white transition-colors"
            >
              <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              Voltar
            </button>
            <h1 className="text-2xl font-bold text-white">Meus Agendamentos</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 py-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : bookings.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Nenhum agendamento encontrado</h3>
            <p className="text-gray-500 mb-6">Você não possui agendamentos futuros.</p>
            <button
              onClick={() => navigate('/booking')}
              className="inline-flex items-center px-6 py-3 bg-gradient-to-r from-amber-500 to-yellow-600 text-white font-medium rounded-lg hover:from-amber-600 hover:to-yellow-700 transition-all"
            >
              Agendar Agora
            </button>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {bookings.map((booking) => (
              <div
                key={booking.id}
                className="bg-gray-900/50 backdrop-blur-sm border border-gray-800 rounded-xl p-6 hover:border-amber-500/50 transition-all"
              >
                <div className="flex items-start justify-between mb-4">
                  <div className="flex-1">
                    <h3 className="text-xl font-semibold text-white mb-2">
                      {booking.barbearia_nome || 'Barbearia'}
                    </h3>
                    <div className="flex items-center text-gray-400 mb-2">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
                      </svg>
                      {booking.barbeiro?.nome || 'Barbeiro não especificado'}
                    </div>
                    <div className="flex items-center text-gray-400">
                      <svg className="h-5 w-5 mr-2" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                      {new Date(booking.date).toLocaleDateString('pt-BR')} às {booking.time}
                    </div>
                  </div>
                  <span className={`px-3 py-1 rounded-full text-sm font-medium border ${getStatusBadge(booking.status)}`}>
                    {getStatusText(booking.status)}
                  </span>
                </div>

                {booking.services && booking.services.length > 0 && (
                  <div className="mb-4 p-4 bg-gray-800/50 rounded-lg">
                    <p className="text-gray-300">
                      <span className="font-medium">Serviço:</span> {booking.services[0].name}
                    </p>
                    {booking.services[0].price && (
                      <p className="text-gray-300 mt-1">
                        <span className="font-medium">Valor:</span> R$ {Number(booking.services[0].price).toFixed(2)}
                      </p>
                    )}
                  </div>
                )}

                <div className="flex gap-3 mt-4">
                  <button
                    onClick={() => handleRescheduleClick(booking)}
                    className="flex-1 px-4 py-2 bg-blue-600 hover:bg-blue-700 text-white rounded-lg transition-colors font-medium"
                  >
                    Reagendar
                  </button>
                  <button
                    onClick={() => handleCancelClick(booking.id)}
                    disabled={cancellingId === booking.id}
                    className="flex-1 px-4 py-2 bg-red-600 hover:bg-red-700 disabled:bg-gray-700 disabled:cursor-not-allowed text-white rounded-lg transition-colors font-medium"
                  >
                    {cancellingId === booking.id ? 'Cancelando...' : 'Cancelar'}
                  </button>
                </div>
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Cancel Modal */}
      <ConfirmationModal
        isOpen={showCancelModal}
        title="Cancelar Agendamento"
        message="Tem certeza que deseja cancelar este agendamento? Esta ação não pode ser desfeita."
        confirmText="Sim, cancelar"
        cancelText="Não, manter"
        onConfirm={confirmCancel}
        onCancel={() => {
          setShowCancelModal(false);
          setBookingToCancel(null);
        }}
        variant="danger"
      />

      {/* Reschedule Modal */}
      {showRescheduleModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">Reagendar</h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Nova Data</label>
                <input
                  type="date"
                  value={rescheduleDate}
                  onChange={(e) => setRescheduleDate(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Novo Horário</label>
                <input
                  type="time"
                  value={rescheduleTime}
                  onChange={(e) => setRescheduleTime(e.target.value)}
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                />
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Barbeiro</label>
                {isLoadingBarbers ? (
                  <div className="text-gray-400">Carregando...</div>
                ) : (
                  <select
                    value={rescheduleBarberId}
                    onChange={(e) => setRescheduleBarberId(Number(e.target.value))}
                    className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20"
                  >
                    <option value="">Selecione um barbeiro</option>
                    {availableBarbers.map((barber) => (
                      <option key={barber.id_barbeiro} value={barber.id_barbeiro}>
                        {barber.nome}
                      </option>
                    ))}
                  </select>
                )}
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowRescheduleModal(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitReschedule}
                disabled={isSubmittingReschedule}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 text-white rounded-lg transition-all font-medium"
              >
                {isSubmittingReschedule ? 'Enviando...' : 'Confirmar'}
              </button>
            </div>
          </div>
        </div>
      )}

      {/* Toasts */}
      <div className="fixed top-4 right-4 z-50 space-y-2">
        {toasts.map((toast) => (
          <Toast key={toast.id} message={toast.message} type={toast.type} onClose={() => removeToast(toast.id)} />
        ))}
      </div>
    </div>
  );
};

export default MyAppointments;
