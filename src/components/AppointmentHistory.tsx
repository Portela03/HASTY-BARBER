import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { bookingService, evaluationService } from '../services/api';
import { useToast } from '../hooks/useToast';
import type { BookingResponse, ApiErrorResponse } from '../types';
import Toast from './Toast';

const AppointmentHistory: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, success: showSuccess, error: showError } = useToast();
  
  
  const [bookings, setBookings] = useState<BookingResponse[]>([]);
  const [isLoading, setIsLoading] = useState(true);
  const [filter, setFilter] = useState<'all' | 'completed' | 'cancelled'>('all');
  
  
  const [showReviewModal, setShowReviewModal] = useState(false);
  const [reviewBookingId, setReviewBookingId] = useState<number | null>(null);
  const [reviewRating, setReviewRating] = useState<number>(0);
  const [reviewComment, setReviewComment] = useState<string>('');
  const [reviewTarget, setReviewTarget] = useState<'barbeiro' | 'barbearia'>('barbeiro');
  const [isSubmittingReview, setIsSubmittingReview] = useState(false);

  useEffect(() => {
    loadBookings();
  }, []);

  const loadBookings = async () => {
    setIsLoading(true);
    try {
      const data = await bookingService.listMine();
      setBookings(data || []);
    } catch (err: unknown) {
      const error = err as ApiErrorResponse;
      showError(error?.response?.data?.message || error.message || 'Erro ao carregar histórico');
    } finally {
      setIsLoading(false);
    }
  };

  const filteredBookings = bookings.filter((b) => {
    if (filter === 'completed') return b.status === 'finalizado';
    if (filter === 'cancelled') return b.status === 'cancelado';
    return true;
  });

  const openReview = (bookingId: number, target: 'barbeiro' | 'barbearia') => {
    setReviewBookingId(bookingId);
    setReviewTarget(target);
    setReviewRating(0);
    setReviewComment('');
    setShowReviewModal(true);
  };

  const submitReview = async () => {
    if (!reviewBookingId || reviewRating === 0) {
      showError('Selecione uma nota');
      return;
    }

    setIsSubmittingReview(true);
    try {
      await evaluationService.create({
        id_booking: reviewBookingId,
        rating: reviewRating,
        comentario: reviewComment || undefined,
        target: reviewTarget,
      });
      showSuccess('Avaliação enviada com sucesso!');
      setShowReviewModal(false);
      loadBookings();
    } catch (err: unknown) {
      const error = err as ApiErrorResponse;
      showError(error?.response?.data?.message || error.message || 'Erro ao enviar avaliação');
    } finally {
      setIsSubmittingReview(false);
    }
  };

  const getStatusBadge = (status: string) => {
    const badges = {
      finalizado: 'bg-green-500/20 text-green-400 border-green-500/30',
      cancelado: 'bg-red-500/20 text-red-400 border-red-500/30',
      pendente: 'bg-yellow-500/20 text-yellow-400 border-yellow-500/30',
      confirmado: 'bg-blue-500/20 text-blue-400 border-blue-500/30',
    };
    return badges[status as keyof typeof badges] || 'bg-gray-500/20 text-gray-400 border-gray-500/30';
  };

  const getStatusText = (status: string) => {
    const texts = {
      finalizado: 'Finalizado',
      cancelado: 'Cancelado',
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
            <h1 className="text-2xl font-bold text-white">Histórico</h1>
            <div className="w-20" />
          </div>
        </div>
      </div>

      {/* Filter Tabs */}
      <div className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pt-6">
        <div className="flex gap-2 mb-6 overflow-x-auto">
          <button
            onClick={() => setFilter('all')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              filter === 'all'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Todos
          </button>
          <button
            onClick={() => setFilter('completed')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              filter === 'completed'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Finalizados
          </button>
          <button
            onClick={() => setFilter('cancelled')}
            className={`px-4 py-2 rounded-lg font-medium transition-all whitespace-nowrap ${
              filter === 'cancelled'
                ? 'bg-gradient-to-r from-amber-500 to-yellow-600 text-white'
                : 'bg-gray-800 text-gray-400 hover:bg-gray-700'
            }`}
          >
            Cancelados
          </button>
        </div>
      </div>

      {/* Main Content */}
      <main className="max-w-7xl mx-auto px-4 sm:px-6 lg:px-8 pb-8">
        {isLoading ? (
          <div className="flex items-center justify-center py-12">
            <div className="animate-spin rounded-full h-12 w-12 border-b-2 border-amber-500"></div>
          </div>
        ) : filteredBookings.length === 0 ? (
          <div className="text-center py-12">
            <svg className="mx-auto h-16 w-16 text-gray-600 mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
            </svg>
            <h3 className="text-xl font-medium text-gray-400 mb-2">Nenhum agendamento encontrado</h3>
            <p className="text-gray-500">Não há agendamentos para exibir neste filtro.</p>
          </div>
        ) : (
          <div className="grid grid-cols-1 gap-6">
            {filteredBookings.map((booking) => (
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

                {/* Review Buttons - Only for completed bookings */}
                {booking.status === 'finalizado' && (
                  <div className="flex gap-3 mt-4">
                    <button
                      onClick={() => openReview(booking.id, 'barbeiro')}
                      className="flex-1 px-4 py-2 bg-amber-600 hover:bg-amber-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Avaliar Barbeiro
                    </button>
                    <button
                      onClick={() => openReview(booking.id, 'barbearia')}
                      className="flex-1 px-4 py-2 bg-yellow-600 hover:bg-yellow-700 text-white rounded-lg transition-colors font-medium"
                    >
                      Avaliar Barbearia
                    </button>
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
      </main>

      {/* Review Modal */}
      {showReviewModal && (
        <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-4">
          <div className="bg-gray-900 rounded-xl border border-gray-800 p-6 max-w-md w-full">
            <h3 className="text-xl font-bold text-white mb-4">
              Avaliar {reviewTarget === 'barbeiro' ? 'Barbeiro' : 'Barbearia'}
            </h3>
            
            <div className="space-y-4">
              <div>
                <label className="block text-sm font-medium text-gray-300 mb-3">Nota</label>
                <div className="flex gap-2 justify-center">
                  {[1, 2, 3, 4, 5].map((star) => (
                    <button
                      key={star}
                      onClick={() => setReviewRating(star)}
                      className="transition-transform hover:scale-110"
                    >
                      <svg
                        className={`h-10 w-10 ${
                          star <= reviewRating ? 'text-amber-500 fill-current' : 'text-gray-600'
                        }`}
                        fill="none"
                        viewBox="0 0 24 24"
                        stroke="currentColor"
                      >
                        <path
                          strokeLinecap="round"
                          strokeLinejoin="round"
                          strokeWidth={2}
                          d="M11.049 2.927c.3-.921 1.603-.921 1.902 0l1.519 4.674a1 1 0 00.95.69h4.915c.969 0 1.371 1.24.588 1.81l-3.976 2.888a1 1 0 00-.363 1.118l1.518 4.674c.3.922-.755 1.688-1.538 1.118l-3.976-2.888a1 1 0 00-1.176 0l-3.976 2.888c-.783.57-1.838-.197-1.538-1.118l1.518-4.674a1 1 0 00-.363-1.118l-3.976-2.888c-.784-.57-.38-1.81.588-1.81h4.914a1 1 0 00.951-.69l1.519-4.674z"
                        />
                      </svg>
                    </button>
                  ))}
                </div>
              </div>

              <div>
                <label className="block text-sm font-medium text-gray-300 mb-2">Comentário (opcional)</label>
                <textarea
                  value={reviewComment}
                  onChange={(e) => setReviewComment(e.target.value)}
                  rows={4}
                  placeholder="Conte-nos sobre sua experiência..."
                  className="w-full px-4 py-2 bg-gray-800 border border-gray-700 rounded-lg text-white placeholder-gray-500 focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 resize-none"
                />
              </div>
            </div>

            <div className="flex gap-3 mt-6">
              <button
                onClick={() => setShowReviewModal(false)}
                className="flex-1 px-4 py-2 bg-gray-800 hover:bg-gray-700 text-white rounded-lg transition-colors"
              >
                Cancelar
              </button>
              <button
                onClick={submitReview}
                disabled={isSubmittingReview || reviewRating === 0}
                className="flex-1 px-4 py-2 bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 disabled:opacity-50 text-white rounded-lg transition-all font-medium"
              >
                {isSubmittingReview ? 'Enviando...' : 'Enviar Avaliação'}
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

export default AppointmentHistory;
