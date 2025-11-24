import React, { useState, useEffect } from 'react';
import { useNavigate } from 'react-router-dom';
import { barbershopService, barberService, serviceService, bookingService, evaluationService } from '../services/api';
import type { Barbearia, Barbeiro, ServiceItem, BookingForm } from '../types';
import { isValidTimeHHMM } from '../utils/validation';
import { useToast } from '../hooks/useToast';
import Toast from './Toast';

const BookingService: React.FC = () => {
  const navigate = useNavigate();
  const { toasts, removeToast, error: showError, warning } = useToast();
  const [step, setStep] = useState<1 | 2>(1);
  const [selectedBarbershopId, setSelectedBarbershopId] = useState<number | ''>('');
  const [barbershops, setBarbershops] = useState<Barbearia[]>([]);
  const [isLoadingBarbershops, setIsLoadingBarbershops] = useState(true);
  const [barbershopError, setBarbershopError] = useState<string | null>(null);
  
  const [availableBarbers, setAvailableBarbers] = useState<Barbeiro[] | null>(null);
  const [isLoadingBarbers, setIsLoadingBarbers] = useState(false);
  const [barbersError, setBarbersError] = useState<string | null>(null);
  
  const [barberReviewsMap, setBarberReviewsMap] = useState<Record<number, { average: number | null; total: number }>>({});
  
  const [barbershopReviewsMap, setBarbershopReviewsMap] = useState<Record<number, { average: number | null; total: number }>>({});
  
  const [availableServices, setAvailableServices] = useState<ServiceItem[] | null>(null);
  const [isLoadingServices, setIsLoadingServices] = useState(false);
  const [servicesError, setServicesError] = useState<string | null>(null);
  
  const [booking, setBooking] = useState<BookingForm>({
    service: [],
    date: '',
    time: '',
    barber_id: '',
    notes: '',
  });
  const [bookingDurationMinutes, setBookingDurationMinutes] = useState<number | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [showSuccessModal, setShowSuccessModal] = useState(false);

  useEffect(() => {
    loadBarbershops();
  }, []);

  const loadBarbershops = async () => {
    setIsLoadingBarbershops(true);
    setBarbershopError(null);
    try {
      const data = await barbershopService.list();
      setBarbershops(data);
      
      try {
        const ids = (data || []).map((s: any) => Number(s.id_barbearia)).filter((x: number) => Number.isFinite(x) && x > 0);
        const idsToFetch = ids.filter((i: number) => !(i in barbershopReviewsMap));
        if (idsToFetch.length > 0) {
          const results = await Promise.allSettled(idsToFetch.map((id) => evaluationService.listByBarbershop(id)));
          const next: Record<number, { average: number | null; total: number }> = {};
          results.forEach((res, idx) => {
            const id = idsToFetch[idx];
            if (res.status === 'fulfilled' && res.value) next[id] = { average: res.value.average ?? null, total: res.value.total ?? 0 };
          });
          if (Object.keys(next).length > 0) setBarbershopReviewsMap((p) => ({ ...p, ...next }));
        }
      } catch {}
    } catch (err: any) {
      const msg = err?.response?.data?.message || err?.message || 'Erro ao carregar barbearias.';
      setBarbershopError(msg);
    } finally {
      setIsLoadingBarbershops(false);
    }
  };

  const handleSelectBarbershop = async (id: number) => {
    setSelectedBarbershopId(id);
    setStep(2);
    setIsLoadingBarbers(true);
    setIsLoadingServices(true);
    setBarbersError(null);
    setServicesError(null);
    
    try {
      const barbers = await barberService.listByBarbershop(id, { onlyActive: true });
      setAvailableBarbers(barbers || []);
      
      try {
        const ids = (barbers || []).map((b: any) => Number((b as any).id_barbeiro)).filter((x) => Number.isFinite(x) && x > 0);
        const idsToFetch = ids.filter((i) => !(i in barberReviewsMap));
        if (idsToFetch.length > 0) {
          const results = await Promise.allSettled(idsToFetch.map((bid) => evaluationService.listByBarber(bid)));
          const next: Record<number, { average: number | null; total: number }> = {};
          results.forEach((res, idx) => {
            const bid = idsToFetch[idx];
            if (res.status === 'fulfilled' && res.value) next[bid] = { average: res.value.average ?? null, total: res.value.total ?? 0 };
          });
          if (Object.keys(next).length > 0) setBarberReviewsMap((p) => ({ ...p, ...next }));
        }
      } catch {}
    } catch (err: any) {
      setBarbersError(err?.response?.data?.message || err?.message || 'Erro ao carregar barbeiros.');
    } finally {
      setIsLoadingBarbers(false);
    }
    
    try {
      const services = await serviceService.listByBarbershop(id);
      setAvailableServices(services || []);
    } catch (err: any) {
      setServicesError(err?.response?.data?.message || err?.message || 'Erro ao carregar serviços.');
    } finally {
      setIsLoadingServices(false);
    }
  };

  const handleServiceToggle = (id: number) => {
    const idStr = String(id);
    const isSelected = booking.service.includes(idStr);
    const newServices = isSelected
      ? booking.service.filter((s) => s !== idStr)
      : [...booking.service, idStr];
    
    setBooking({ ...booking, service: newServices, barber_id: '' });
    
    const allServices = availableServices || [];
    const selectedServices = allServices.filter((s) => newServices.includes(String(s.id)));
    
    setBookingDurationMinutes(selectedServices.length > 0 ? selectedServices.length * 30 : null);
  };

  const handleSubmit = async () => {
    if (booking.service.length === 0) {
      warning('Selecione pelo menos um serviço.');
      return;
    }
    if (!booking.date || !booking.time) {
      warning('Informe a data e horário.');
      return;
    }
    if (!isValidTimeHHMM(booking.time)) {
      warning('Horário inválido. Use o formato HH:MM (ex: 09:30).');
      return;
    }
    if (!booking.barber_id) {
      warning('Selecione um barbeiro.');
      return;
    }

    const selectedDateTime = new Date(`${booking.date}T${booking.time}`);
    const now = new Date();
    if (selectedDateTime < now) {
      warning('Não é possível agendar no passado.');
      return;
    }

    setIsSubmitting(true);
    
    const payload = {
      id_barbearia: Number(selectedBarbershopId),
      service: booking.service,
      date: booking.date,
      time: booking.time,
      barber_id: Number(booking.barber_id),
      notes: booking.notes || undefined,
    };
    
    console.log('[FRONTEND] Tentando criar agendamento:', payload);
    
    try {
      
      const svcNames = (availableServices || [])
        .filter((s) => booking.service.includes(String(s.id)))
        .map((s) => s.nome);
      const payloadService = svcNames.length > 0 ? svcNames : booking.service;

      await bookingService.create({
        id_barbearia: Number(selectedBarbershopId),
        service: payloadService,
        date: booking.date,
        time: booking.time,
        barber_id: Number(booking.barber_id),
        notes: booking.notes || undefined,
      });
      setShowSuccessModal(true);
    } catch (err: any) {
      console.error('[FRONTEND] Erro ao criar agendamento:', err);
      console.error('[FRONTEND] Response completa:', err?.response);
      console.error('[FRONTEND] Response data:', err?.response?.data);
      console.error('[FRONTEND] Status HTTP:', err?.response?.status);
      console.error('[FRONTEND] Payload enviado:', payload);
      
      
      let errorMessage = err?.response?.data?.message || err?.message || 'Erro ao criar agendamento.';
      
      
      if (errorMessage.includes('não oferece')) {
        const barberName = availableBarbers?.find(b => b.id_barbeiro === booking.barber_id)?.nome || 'O barbeiro selecionado';
        errorMessage = `${barberName} não está disponível para realizar todos os serviços selecionados. Por favor, escolha outro barbeiro ou revise os serviços.`;
      }
      
      showError(errorMessage);
    } finally {
      setIsSubmitting(false);
    }
  };

  const selectedBarbershop = barbershops.find((b) => b.id_barbearia === selectedBarbershopId);

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-900 via-gray-800 to-gray-900 py-8 px-4">
      <div className="max-w-4xl mx-auto">
        {/* Header */}
        <div className="relative bg-gradient-to-br from-gray-800 via-gray-700 to-gray-800 rounded-2xl shadow-2xl p-8 mb-6 border border-gray-600 overflow-hidden">
          {/* Decorative gradient circles */}
          <div className="absolute top-0 right-0 w-64 h-64 bg-gradient-to-br from-amber-500/10 to-yellow-500/5 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-48 h-48 bg-gradient-to-tr from-yellow-500/10 to-amber-500/5 rounded-full blur-3xl"></div>
          
          <div className="relative z-10">
            <button
              onClick={() => step === 1 ? navigate('/dashboard') : setStep(1)}
              className="mb-4 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-all hover:-translate-x-1"
            >
              <svg className="w-5 h-5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-medium">Voltar</span>
            </button>
            
            <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500 mb-2 animate-[shimmer_5s_infinite] bg-[length:200%_auto]">
              AGENDAR SERVIÇO
            </h1>
            <p className="text-gray-300 text-sm">
              {step === 1 ? 'Selecione a barbearia de sua preferência' : 'Complete os detalhes do seu agendamento'}
            </p>
            
            {/* Progress indicator */}
            <div className="mt-6 flex items-center gap-2">
              <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= 1 ? 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/50' : 'bg-gray-600'}`} />
              <div className={`h-2 flex-1 rounded-full transition-all duration-500 ${step >= 2 ? 'bg-gradient-to-r from-amber-500 to-yellow-500 shadow-lg shadow-amber-500/50' : 'bg-gray-600'}`} />
            </div>
          </div>
        </div>

        {/* Step 1: Select Barbershop */}
        {step === 1 && (
          <div className="bg-gray-800 rounded-2xl shadow-xl p-6 border border-gray-700">
            <h2 className="text-2xl font-bold text-amber-400 mb-6">Escolha uma Barbearia</h2>
            
            {isLoadingBarbershops ? (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {[1, 2, 3, 4].map((i) => (
                  <div key={i} className="bg-gray-700 rounded-xl p-6 border-2 border-gray-600 animate-[fadeInUp_0.6s_ease-out]" style={{ animationDelay: `${i * 0.1}s` }}>
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-r from-gray-600 to-gray-500 animate-[shimmer_2s_infinite] bg-[length:200%_auto]" />
                      <div className="flex-1 space-y-3">
                        <div className="h-6 bg-gradient-to-r from-gray-600 to-gray-500 rounded animate-[shimmer_2s_infinite] bg-[length:200%_auto]" style={{ animationDelay: `${i * 0.2}s` }} />
                        <div className="h-4 bg-gradient-to-r from-gray-600 to-gray-500 rounded w-3/4 animate-[shimmer_2s_infinite] bg-[length:200%_auto]" style={{ animationDelay: `${i * 0.3}s` }} />
                        <div className="h-4 bg-gradient-to-r from-gray-600 to-gray-500 rounded w-1/2 animate-[shimmer_2s_infinite] bg-[length:200%_auto]" style={{ animationDelay: `${i * 0.4}s` }} />
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            ) : barbershopError ? (
              <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
                {barbershopError}
              </div>
            ) : barbershops.length === 0 ? (
              <div className="text-center py-12">
                <div className="inline-block animate-[float_3s_ease-in-out_infinite]">
                  <svg className="w-20 h-20 text-gray-600 mx-auto mb-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M19 21V5a2 2 0 00-2-2H7a2 2 0 00-2 2v16m14 0h2m-2 0h-5m-9 0H3m2 0h5M9 7h1m-1 4h1m4-4h1m-1 4h1m-5 10v-5a1 1 0 011-1h2a1 1 0 011 1v5m-4 0h4" />
                  </svg>
                </div>
                <h3 className="text-xl font-semibold text-transparent bg-clip-text bg-gradient-to-r from-gray-400 to-gray-500 mb-2">Nenhuma barbearia disponível</h3>
                <p className="text-gray-500">No momento não há barbearias cadastradas.</p>
              </div>
            ) : (
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                {barbershops.map((shop, index) => (
                  <div
                    key={shop.id_barbearia}
                    onClick={() => handleSelectBarbershop(shop.id_barbearia)}
                    className="bg-gradient-to-br from-gray-700 via-gray-700 to-gray-800 rounded-xl p-6 border-2 border-gray-600 hover:border-amber-500 cursor-pointer transition-all hover:shadow-2xl hover:shadow-amber-500/30 hover:-translate-y-1 group animate-[fadeInUp_0.6s_ease-out]"
                    style={{ animationDelay: `${index * 0.1}s` }}
                  >
                    <div className="flex items-start gap-4">
                      <div className="w-16 h-16 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold text-xl flex-shrink-0">
                        {shop.nome.charAt(0).toUpperCase()}
                      </div>
                      <div className="flex-1 min-w-0">
                        <h3 className="text-lg font-bold text-white group-hover:text-amber-400 transition-colors mb-2">
                          {shop.nome}
                        </h3>
                        {/* Ratings */}
                        {(() => {
                          const rev = barbershopReviewsMap[Number(shop.id_barbearia)];
                          if (!rev || (rev.average === null && rev.total === 0)) {
                            return <p className="text-xs text-gray-400 mb-1">Sem avaliações</p>;
                          }
                          const avg = Number.isFinite(Number(rev.average)) ? Number(rev.average) : null;
                          return (
                            <div className="flex items-center gap-2 mb-1">
                              <div className="flex items-center gap-0.5">
                                {Array.from({ length: 5 }).map((_, i) => (
                                  <svg
                                    key={i}
                                    className={`w-4 h-4 ${avg !== null && i < Math.round(avg) ? 'text-yellow-400' : 'text-white/40'}`}
                                    viewBox="0 0 20 20"
                                    fill="currentColor"
                                  >
                                    <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.07 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                  </svg>
                                ))}
                              </div>
                              <span className="text-xs tabular-nums text-amber-200 font-semibold">{avg !== null ? avg.toFixed(1) : '-'}</span>
                              <span className="text-xs text-gray-400">({rev.total})</span>
                            </div>
                          );
                        })()}
                        {shop.endereco && (
                          <p className="text-sm text-gray-400 mb-1 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M17.657 16.657L13.414 20.9a1.998 1.998 0 01-2.827 0l-4.244-4.243a8 8 0 1111.314 0z" />
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 11a3 3 0 11-6 0 3 3 0 016 0z" />
                            </svg>
                            <span className="break-words">{shop.endereco}</span>
                          </p>
                        )}
                        {shop.telefone_contato && (
                          <p className="text-sm text-gray-400 mb-1 flex items-center gap-2">
                            <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 5a2 2 0 012-2h3.28a1 1 0 01.948.684l1.498 4.493a1 1 0 01-.502 1.21l-2.257 1.13a11.042 11.042 0 005.516 5.516l1.13-2.257a1 1 0 011.21-.502l4.493 1.498a1 1 0 01.684.949V19a2 2 0 01-2 2h-1C9.716 21 3 14.284 3 6V5z" />
                            </svg>
                            {shop.telefone_contato}
                          </p>
                        )}
                        {shop.horario_funcionamento && (
                          <p className="text-sm text-gray-400 flex items-start gap-2">
                            <svg className="w-4 h-4 mt-0.5 flex-shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                              <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                            </svg>
                            <span className="break-words">{shop.horario_funcionamento}</span>
                          </p>
                        )}
                      </div>
                    </div>
                  </div>
                ))}
              </div>
            )}
          </div>
        )}

        {/* Step 2: Booking Details */}
        {step === 2 && selectedBarbershop && (
          <div className="space-y-6">
            {/* Selected Barbershop Info */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <div className="flex items-center justify-between">
                <div>
                  <p className="text-sm text-gray-400 mb-1">Barbearia selecionada</p>
                  <h3 className="text-xl font-bold text-amber-400">{selectedBarbershop.nome}</h3>
                </div>
                <button
                  onClick={() => setStep(1)}
                  className="text-sm text-gray-400 hover:text-amber-400 transition-colors"
                >
                  Alterar
                </button>
              </div>
            </div>

            {/* Services Selection */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-amber-400 mb-4">Selecione os Serviços</h2>
              
              {isLoadingServices ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
                </div>
              ) : servicesError ? (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
                  {servicesError}
                </div>
              ) : !availableServices || availableServices.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Nenhum serviço disponível.
                </div>
              ) : (
                <div className="space-y-3">
                {availableServices.map((service) => (
                  <label
                    key={service.id}
                    className={`block bg-gray-700 rounded-lg p-4 border-2 cursor-pointer transition-all ${
                      booking.service.includes(String(service.id))
                        ? 'border-amber-500 bg-amber-500/10'
                        : 'border-gray-600 hover:border-gray-500'
                    }`}
                  >
                    <div className="flex items-center gap-3">
                      <input
                        type="checkbox"
                        checked={booking.service.includes(String(service.id))}
                        onChange={() => handleServiceToggle(service.id)}
                          className="w-5 h-5 text-amber-500 bg-gray-600 border-gray-500 rounded focus:ring-amber-500 focus:ring-2"
                        />
                        <div className="flex-1">
                          <div className="flex items-center justify-between">
                            <span className="font-semibold text-white">{service.nome}</span>
                            <span className="text-amber-400 font-bold">
                              R$ {typeof service.preco === 'number' ? service.preco.toFixed(2) : service.preco}
                            </span>
                          </div>
                          {service.descricao && (
                            <p className="text-sm text-gray-400 mt-1">{service.descricao}</p>
                          )}
                        </div>
                      </div>
                    </label>
                  ))}
                </div>
              )}
              
              {bookingDurationMinutes && bookingDurationMinutes > 0 && (
                <div className="mt-4 bg-amber-500/10 border border-amber-500/30 rounded-lg p-3">
                  <p className="text-sm text-amber-300">
                    Duração total estimada: <span className="font-bold">{Math.floor(bookingDurationMinutes / 60)}h {bookingDurationMinutes % 60}min</span>
                  </p>
                </div>
              )}
            </div>

            {/* Date and Time */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-amber-400 mb-4">Data e Horário</h2>
              <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Data</label>
                  <input
                    type="date"
                    value={booking.date}
                    onChange={(e) => setBooking({ ...booking, date: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
                <div>
                  <label className="block text-sm font-medium text-gray-300 mb-2">Horário</label>
                  <input
                    type="time"
                    value={booking.time}
                    onChange={(e) => setBooking({ ...booking, time: e.target.value })}
                    className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white focus:ring-2 focus:ring-amber-500 focus:border-transparent"
                  />
                </div>
              </div>
            </div>

            {/* Barber Selection */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-amber-400 mb-4">Escolha o Barbeiro</h2>
              
              {/* Only show barbers after selecting at least one service */}
              {booking.service.length === 0 ? (
                <div className="text-center py-8">
                  <p className="text-gray-400">Selecione primeiro ao menos um serviço para ver os barbeiros disponíveis.</p>
                </div>
              ) : isLoadingBarbers ? (
                <div className="flex justify-center py-8">
                  <div className="animate-spin rounded-full h-10 w-10 border-b-2 border-amber-500" />
                </div>
              ) : barbersError ? (
                <div className="bg-red-900/30 border border-red-700 rounded-lg p-4 text-red-300">
                  {barbersError}
                </div>
              ) : !availableBarbers || availableBarbers.length === 0 ? (
                <div className="text-center py-8 text-gray-400">
                  Nenhum barbeiro disponível.
                </div>
              ) : (
                (() => {
                  
                  const selectedServiceNames = (availableServices || [])
                    .filter((s) => booking.service.includes(String(s.id)))
                    .map((s) => s.nome || '')
                    .filter(Boolean);
                  
                  
                  const filteredBarbers = selectedServiceNames.length === 0 || !availableBarbers || availableBarbers.length === 0
                    ? (availableBarbers || [])
                    : (availableBarbers || []).filter((b) => {
                        
                        if (!b.especialidades || b.especialidades.trim() === '') return true;
                        
                        const specs = new Set(
                          (b.especialidades || '').split(',').map((x) => x.trim().toLowerCase()).filter(Boolean)
                        );
                        
                        
                        return selectedServiceNames.some((serviceName) => {
                          const serviceNameLower = serviceName.trim().toLowerCase();
                          
                          return Array.from(specs).some(spec => 
                            spec === serviceNameLower || 
                            spec.includes(serviceNameLower) || 
                            serviceNameLower.includes(spec)
                          );
                        });
                      });

                  if ((filteredBarbers || []).length === 0) {
                    return (
                      <div className="text-center py-8">
                        <p className="text-gray-400">Nenhum barbeiro disponível para os serviços selecionados.</p>
                      </div>
                    );
                  }

                  return (
                    <div className="grid grid-cols-1 md:grid-cols-2 gap-3">
                      {filteredBarbers.map((barber) => (
                        <label
                          key={barber.id_barbeiro}
                          className={`block bg-gray-700 rounded-lg p-4 border-2 cursor-pointer transition-all ${
                            booking.barber_id === barber.id_barbeiro
                              ? 'border-amber-500 bg-amber-500/10'
                              : 'border-gray-600 hover:border-gray-500'
                          }`}
                        >
                          <div className="flex items-center gap-3">
                            <input
                              type="radio"
                              name="barber"
                              checked={booking.barber_id === barber.id_barbeiro}
                              onChange={() => setBooking({ ...booking, barber_id: barber.id_barbeiro || 0 })}
                              className="w-5 h-5 text-amber-500 bg-gray-600 border-gray-500 focus:ring-amber-500 focus:ring-2"
                            />
                            <div className="flex items-center gap-3 flex-1">
                              {barber.avatar_url ? (
                                <img
                                  src={barber.avatar_url}
                                  alt={barber.nome}
                                  className="w-12 h-12 rounded-full object-cover"
                                />
                              ) : (
                                <div className="w-12 h-12 rounded-full bg-gradient-to-br from-amber-500 to-yellow-600 flex items-center justify-center text-white font-bold">
                                  {barber.nome.charAt(0).toUpperCase()}
                                </div>
                              )}
                              <div className="flex-1 min-w-0">
                                <p className="font-semibold text-white truncate">{barber.nome}</p>
                                {barber.especialidades && (
                                  <p className="text-xs text-gray-400 truncate">
                                    {barber.especialidades}
                                  </p>
                                )}
                                {/* Barber Ratings */}
                                {(() => {
                                  const rev = barberReviewsMap[Number(barber.id_barbeiro)];
                                  if (!rev || (rev.average === null && rev.total === 0)) {
                                    return <p className="text-xs text-gray-400 mt-1">Sem avaliações</p>;
                                  }
                                  const avg = Number.isFinite(Number(rev.average)) ? Number(rev.average) : null;
                                  return (
                                    <div className="flex items-center gap-2 mt-1">
                                      <div className="flex items-center gap-0.5">
                                        {Array.from({ length: 5 }).map((_, i) => (
                                          <svg
                                            key={i}
                                            className={`w-3 h-3 ${avg !== null && i < Math.round(avg) ? 'text-yellow-400' : 'text-white/40'}`}
                                            viewBox="0 0 20 20"
                                            fill="currentColor"
                                          >
                                            <path d="M9.049 2.927c.3-.921 1.603-.921 1.902 0l1.286 3.957a1 1 0 00.95.69h4.162c.969 0 1.371 1.24.588 1.81l-3.37 2.448a1 1 0 00-.364 1.118l1.287 3.957c.3.921-.755 1.688-1.54 1.118l-3.37-2.448a1 1 0 00-1.176 0l-3.37 2.448c-.785.57-1.84-.197-1.54-1.118l1.287-3.957a1 1 0 00-.364-1.118L2.07 9.384c-.783-.57-.38-1.81.588-1.81h4.162a1 1 0 00.95-.69l1.286-3.957z" />
                                          </svg>
                                        ))}
                                      </div>
                                      <span className="text-xs tabular-nums text-amber-200 font-semibold">{avg !== null ? avg.toFixed(1) : '-'}</span>
                                      <span className="text-xs text-gray-400">({rev.total})</span>
                                    </div>
                                  );
                                })()}
                                    {/* Contact info */}
                          
                                    {barber.email && (
                                      <p className="text-xs text-gray-300 mt-0.5 flex items-center gap-2">
                                        <svg className="w-4 h-4 text-gray-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                                          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8m0 0v8a2 2 0 01-2 2H5a2 2 0 01-2-2V8m18 0L12 13 3 8" />
                                        </svg>
                                        <span className="truncate">{barber.email}</span>
                                      </p>
                                    )}
                              </div>
                            </div>
                          </div>
                        </label>
                      ))}
                    </div>
                  );
                })()
              )}
            </div>

            {/* Notes */}
            <div className="bg-gray-800 rounded-xl p-6 border border-gray-700">
              <h2 className="text-xl font-bold text-amber-400 mb-4">Observações (Opcional)</h2>
              <textarea
                value={booking.notes}
                onChange={(e) => setBooking({ ...booking, notes: e.target.value })}
                placeholder="Adicione alguma observação sobre o agendamento..."
                rows={3}
                className="w-full bg-gray-700 border border-gray-600 rounded-lg px-4 py-2.5 text-white placeholder-gray-500 focus:ring-2 focus:ring-amber-500 focus:border-transparent resize-none"
              />
            </div>

            {/* Submit Button */}
            <div className="flex gap-3">
              <button
                onClick={() => setStep(1)}
                className="flex-1 bg-gradient-to-r from-gray-700 to-gray-600 hover:from-gray-600 hover:to-gray-500 text-white py-3 px-6 rounded-lg font-semibold transition-all shadow-lg hover:shadow-xl hover:-translate-y-0.5"
              >
                Voltar
              </button>
              <button
                onClick={handleSubmit}
                disabled={isSubmitting}
                className="relative flex-1 bg-gradient-to-r from-amber-500 to-yellow-600 text-gray-900 py-3 px-6 rounded-lg font-semibold hover:from-amber-600 hover:to-yellow-700 transition-all disabled:opacity-50 disabled:cursor-not-allowed shadow-xl hover:shadow-2xl hover:shadow-amber-500/50 hover:-translate-y-0.5 overflow-hidden group"
              >
                <span className="relative z-10">{isSubmitting ? 'Agendando...' : 'Confirmar Agendamento'}</span>
                {!isSubmitting && (
                  <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 -translate-x-full group-hover:translate-x-full transition-transform duration-700"></div>
                )}
              </button>
            </div>
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

      {/* Modal de Sucesso */}
      {showSuccessModal && (
        <div className="fixed inset-0 bg-black/80 backdrop-blur-sm flex items-center justify-center z-50 p-4 animate-[fadeIn_0.2s_ease-out]">
          <div className="bg-gradient-to-br from-gray-800 via-gray-900 to-gray-800 rounded-2xl p-8 max-w-md w-full border-2 border-green-500/30 shadow-2xl shadow-green-500/20 animate-[fadeInUp_0.3s_ease-out]">
            {/* Ícone de Sucesso */}
            <div className="flex justify-center mb-6">
              <div className="relative">
                <div className="absolute inset-0 bg-green-500/20 rounded-full blur-xl animate-pulse"></div>
                <div className="relative bg-gradient-to-br from-green-600 to-emerald-700 rounded-full p-4">
                  <svg className="w-12 h-12 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={3} d="M5 13l4 4L19 7" />
                  </svg>
                </div>
              </div>
            </div>

            {/* Título e Mensagem */}
            <h3 className="text-2xl font-bold text-center mb-3 bg-gradient-to-r from-green-400 to-emerald-500 bg-clip-text text-transparent">
              Solicitação Enviada!
            </h3>
            <p className="text-gray-300 text-center mb-2 leading-relaxed">
              Seu pedido de agendamento foi enviado com sucesso!
            </p>
            <p className="text-gray-400 text-center mb-2 text-sm leading-relaxed">
              Agora é só aguardar a <span className="text-amber-400 font-semibold">confirmação do barbeiro</span>.
            </p>
            <p className="text-gray-500 text-center mb-8 text-xs leading-relaxed">
              Você pode acompanhar o status do seu agendamento na próxima tela.
            </p>

            {/* Botão */}
            <button
              onClick={() => navigate('/my-appointments')}
              className="group relative w-full bg-gradient-to-r from-green-600 to-emerald-700 hover:from-green-700 hover:to-emerald-800 text-white px-6 py-3 rounded-xl font-bold transition-all duration-300 shadow-lg hover:shadow-xl hover:shadow-green-500/50 hover:-translate-y-0.5 overflow-hidden"
            >
              <span className="relative z-10">Entendido!</span>
              <div className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/20 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700"></div>
            </button>
          </div>
        </div>
      )}
    </div>
  );
};

export default BookingService;
