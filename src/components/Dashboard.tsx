import React, { useState } from 'react';
import { useNavigate } from 'react-router-dom';
import { useAuth } from '../hooks/useAuth';
import type { BookingForm, BookingRequest, BookingResponse } from '../types';
import { bookingService } from '../services/api';

const Dashboard: React.FC = () => {
  const { user, logout } = useAuth();
  const navigate = useNavigate();

  // Booking panel state
  const [showBooking, setShowBooking] = useState(false);
  const [booking, setBooking] = useState<BookingForm>({
    service: '',
    date: '',
    time: '',
    barber: '',
    notes: '',
  });
  const [isSubmitting, setIsSubmitting] = useState(false);

  // Slide-over: Meus Agendamentos
  const [showMyBookings, setShowMyBookings] = useState(false);
  const [myBookingsTab, setMyBookingsTab] = useState<'proximos' | 'historico'>('proximos');
  const [bookings, setBookings] = useState<BookingResponse[] | null>(null);
  const [isLoadingBookings, setIsLoadingBookings] = useState(false);
  const [bookingsError, setBookingsError] = useState<string | null>(null);
  const [cancellingId, setCancellingId] = useState<number | null>(null);

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

  // (Listagem de agendamentos foi movida para a página Meus Agendamentos)

  const handleBookingChange = (e: React.ChangeEvent<HTMLInputElement | HTMLSelectElement | HTMLTextAreaElement>) => {
    const { name, value } = e.target;
    setBooking(prev => ({ ...prev, [name]: value }));
  };

  const handleBookingSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (isSubmitting) return;
    setIsSubmitting(true);
    try {
      const payload: BookingRequest = {
        service: booking.service,
        date: booking.date,
        time: booking.time,
        barber: booking.barber || undefined,
        notes: booking.notes || undefined,
      };
      const created = await bookingService.create(payload);
      console.log('Agendamento criado:', created);
      alert('Agendamento criado com sucesso.');
      setShowBooking(false);
      setBooking({ service: '', date: '', time: '', barber: '', notes: '' });
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao criar agendamento.';
      console.error('Erro no agendamento:', err);
      alert(msg);
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

  return (
    <div className="min-h-screen bg-gray-100 py-6 px-4 sm:px-6 lg:px-8">
      <div className="max-w-4xl mx-auto">

        <div className="bg-white shadow rounded-lg mb-6">
          <div className="px-4 py-5 sm:px-6 border-b border-gray-200">
            <div className="flex items-center justify-between flex-wrap">
              <div className="min-w-0 flex-1">
                <h1 className="text-2xl font-bold leading-7 text-gray-900 sm:text-3xl sm:leading-9">
                  Dashboard - Hasty Barber
                </h1>
                <p className="mt-1 text-sm text-gray-500">
                  Bem-vindo ao seu painel de controle
                </p>
              </div>
              <div className="mt-4 flex-shrink-0 sm:mt-0">
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
                          Gerenciar Barbeiros
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
                          Agendamentos
                        </dt>
                        <dd className="text-lg font-medium text-gray-900">
                          Em breve
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
                            onClick={() => setShowBooking(true)}
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
              <div className="flex items-center justify-between mb-4">
                <h3 className="text-lg font-medium text-gray-900">Novo Agendamento</h3>
                <button
                  onClick={() => setShowBooking(false)}
                  className="text-gray-500 hover:text-gray-700"
                  aria-label="Fechar"
                >
                  ✕
                </button>
              </div>

              <form onSubmit={handleBookingSubmit} className="space-y-4">
                <div>
                  <label className="block text-sm font-medium text-gray-700">Serviço</label>
                  <select
                    name="service"
                    value={booking.service}
                    onChange={handleBookingChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    required
                  >
                    <option value="">Selecione</option>
                    <option value="corte">Corte</option>
                    <option value="barba">Barba</option>
                    <option value="sobrancelha">Sobrancelha</option>
                    <option value="combo">Combo</option>
                  </select>
                </div>

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
                  <label className="block text-sm font-medium text-gray-700">Barbeiro (opcional)</label>
                  <input
                    type="text"
                    name="barber"
                    value={booking.barber}
                    onChange={handleBookingChange}
                    className="mt-1 block w-full rounded-md border-gray-300 shadow-sm"
                    placeholder="Nome do barbeiro"
                  />
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

              <div className="mb-4 flex gap-2">
                <button
                  onClick={() => setMyBookingsTab('proximos')}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${myBookingsTab === 'proximos' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  Meus Agendamentos
                </button>
                <button
                  onClick={() => setMyBookingsTab('historico')}
                  className={`inline-flex items-center px-3 py-2 rounded-md text-sm font-medium border ${myBookingsTab === 'historico' ? 'bg-indigo-600 text-white border-indigo-600' : 'bg-white text-gray-700 border-gray-300 hover:bg-gray-50'}`}
                >
                  Histórico
                </button>
                <div className="ml-auto">
                  <button
                    onClick={loadBookings}
                    className="inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white bg-indigo-600 hover:bg-indigo-700 focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-indigo-500"
                  >
                    Atualizar
                  </button>
                </div>
              </div>

              <div>
                {isLoadingBookings && <p>Carregando...</p>}
                {bookingsError && <p className="text-red-600">{bookingsError}</p>}
                {!isLoadingBookings && !bookingsError && (
                  <ul className="divide-y divide-gray-200">
                    {(() => {
                      const now = new Date();
                      const toDate = (b: BookingResponse) => new Date(`${b.date}T${b.time}:00`);
                      const items = (bookings || []).filter((b) => {
                        const isPast = toDate(b) < now;
                        if (myBookingsTab === 'proximos') {
                          return (b.status === 'pending' || b.status === 'confirmed') && !isPast;
                        }
                        return b.status !== 'cancelled' && isPast;
                      }).sort((a, b) => {
                        return myBookingsTab === 'proximos' ? (+toDate(a) - +toDate(b)) : (+toDate(b) - +toDate(a));
                      });

                      if (items.length === 0) {
                        return (
                          <li className="py-3">
                            {myBookingsTab === 'proximos' ? 'Nenhum agendamento futuro.' : 'Nenhum agendamento realizado anteriormente.'}
                          </li>
                        );
                      }

                      return items.map((b) => (
                        <li key={b.id} className="py-3">
                          <div className="flex items-start justify-between gap-4">
                            <div>
                              <p className="font-medium capitalize">{b.service}</p>
                              <p className="text-sm text-gray-600">{b.date} às {b.time}{b.barber ? ` • ${b.barber}` : ''}</p>
                              {b.notes && <p className="text-sm text-gray-500 mt-1">{b.notes}</p>}
                            </div>
                            <div className="flex items-center gap-2">
                              {myBookingsTab === 'proximos' ? (
                                <>
                                  <span className={`text-xs rounded-full px-2 py-0.5 ${b.status === 'pending' ? 'bg-yellow-100 text-yellow-800' : 'bg-green-100 text-green-800'}`}>
                                    {b.status}
                                  </span>
                                  <button
                                    onClick={() => handleCancelBooking(b.id)}
                                    disabled={cancellingId === b.id}
                                    className={`inline-flex items-center px-3 py-2 border border-transparent rounded-md shadow-sm text-sm font-medium text-white ${cancellingId === b.id ? 'bg-red-300 cursor-not-allowed' : 'bg-red-600 hover:bg-red-700'} focus:outline-none focus:ring-2 focus:ring-offset-2 focus:ring-red-500`}
                                  >
                                    {cancellingId === b.id ? 'Cancelando...' : 'Cancelar'}
                                  </button>
                                </>
                              ) : (
                                <span className="text-xs rounded-full px-2 py-0.5 bg-gray-100 text-gray-800">concluído</span>
                              )}
                            </div>
                          </div>
                        </li>
                      ));
                    })()}
                  </ul>
                )}
              </div>
            </aside>
          </div>
        )}
      </div>
    </div>
  );
};

export default Dashboard;