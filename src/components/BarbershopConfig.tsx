/* eslint-disable @typescript-eslint/no-explicit-any */
import React, { useEffect, useMemo, useState } from 'react';
import { useParams, Link, useNavigate } from 'react-router-dom';
import { getBarbeariaConfig, patchBarbeariaConfig } from '../services/api';
import type { BarbeariaConfig, BusinessHour } from '../types';
import { useAuth } from '../hooks/useAuth';
import { validateBusinessHoursArray, validateWindowsAndDuration } from '../utils/validation';

const dayLabels = ['Domingo', 'Segunda', 'Terça', 'Quarta', 'Quinta', 'Sexta', 'Sábado'];

function emptyHours(): BusinessHour[] {
  return Array.from({ length: 7 }).map((_, i) => ({ day: i, open: null, close: null }));
}

const BarbershopConfig: React.FC = () => {
  const { id } = useParams<{ id: string }>();
  const navigate = useNavigate();
  const { user } = useAuth();
  const barbeariaId = useMemo(() => Number(id), [id]);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [formErrors, setFormErrors] = useState<{
    general?: string | null;
    duration?: string | null;
    cancel_window_days?: string | null;
    reschedule_window_days?: string | null;
    dayErrors: Record<number, string | null>;
  }>({ dayErrors: {} });
  const [form, setForm] = useState<BarbeariaConfig>({
    duration_minutes: 30,
    cancel_window_days: null,
    reschedule_window_days: null,
    business_hours: emptyHours(),
  } as BarbeariaConfig);
  

  useEffect(() => {
    let mounted = true;
    async function run() {
      try {
        setLoading(true);
        setError(null);
        const cfg = await getBarbeariaConfig(barbeariaId);
        if (!mounted) return;
        setForm({
          duration_minutes: cfg?.duration_minutes ?? 30,
          cancel_window_days: (typeof cfg?.cancel_window_days === 'number' ? cfg.cancel_window_days : null),
          reschedule_window_days: (typeof cfg?.reschedule_window_days === 'number' ? cfg.reschedule_window_days : null),
          business_hours: (cfg?.business_hours?.length ? cfg.business_hours : emptyHours()).map((h, idx) => ({
            day: typeof h.day === 'number' ? h.day : idx,
            open: h.open ?? null,
            close: h.close ?? null,
          })),
        } as BarbeariaConfig);
      } catch (e: unknown) {
        const err = e as { message?: string };
        setError(err?.message || 'Falha ao carregar configurações.');
      } finally {
        setLoading(false);
      }
    }
    if (Number.isFinite(barbeariaId)) run();
    return () => {
      mounted = false;
    };
  }, [barbeariaId]);

  // Simple guards: only proprietario should access
  useEffect(() => {
    if (user && user.tipo_usuario && user.tipo_usuario !== 'proprietario') {
      navigate('/dashboard', { replace: true });
    }
  }, [user, navigate]);

  function updateField<K extends keyof BarbeariaConfig>(key: K, value: BarbeariaConfig[K]) {
    setForm((prev) => ({ ...prev, [key]: value }));
  }

  function updateHour(day: number, which: 'open' | 'close', value: string) {
    setForm((prev) => ({
      ...prev,
      business_hours: prev.business_hours.map((h) =>
        h.day === day ? { ...h, [which]: value === '' ? null : value } : h
      ),
    }));
  }

  // Validate form whenever it changes
  useEffect(() => {
    const { general, dayErrors } = validateBusinessHoursArray(form.business_hours || []);
    const windowsErrs = validateWindowsAndDuration({
      duration_minutes: form.duration_minutes,
      cancel_window_days: form.cancel_window_days,
      reschedule_window_days: form.reschedule_window_days,
    });
    setFormErrors({
      general,
      dayErrors,
      duration: windowsErrs.duration,
      cancel_window_days: windowsErrs.cancel_window_days,
      reschedule_window_days: windowsErrs.reschedule_window_days,
    });
  }, [form]);

  function hasValidationErrors() {
    if (formErrors.general) return true;
    if (formErrors.duration) return true;
    if (formErrors.cancel_window_days) return true;
    if (formErrors.reschedule_window_days) return true;
    for (const k of Object.keys(formErrors.dayErrors || {})) {
      if (formErrors.dayErrors[Number(k)]) return true;
    }
    return false;
  }

  

  // Copia o horário (open/close) do dia selecionado para os dias úteis (Seg–Sex), exceto o próprio e finais de semana
  function applyToWeekdays(fromDay: number) {
    const src = form.business_hours.find((h) => h.day === fromDay);
    if (!src) return;
    setForm((prev) => ({
      ...prev,
      business_hours: prev.business_hours.map((h) => {
        // dias úteis: 1..5; não aplicar em sábado(6) nem domingo(0) e nem no dia de origem
        if (h.day >= 1 && h.day <= 5 && h.day !== fromDay) {
          return { ...h, open: src.open ?? null, close: src.close ?? null };
        }
        return h;
      }),
    }));
  }

  

  async function onSubmit(e: React.FormEvent) {
    e.preventDefault();
    setSuccess(null);
    // Sanitize: se apenas um dos campos estiver preenchido, consideramos fechado (ambos null)
    const sanitizedHours: BusinessHour[] = form.business_hours.map((h) => {
      const open = h.open ?? null;
      const close = h.close ?? null;
      if (!!open !== !!close) {
        return { ...h, open: null, close: null };
      }
      return h;
    });
    // Re-run validation before submit
    const { general, dayErrors } = validateBusinessHoursArray(sanitizedHours);
    const windowsErrs = validateWindowsAndDuration({
      duration_minutes: form.duration_minutes,
      cancel_window_days: form.cancel_window_days,
      reschedule_window_days: form.reschedule_window_days,
    });
    setFormErrors({ general, dayErrors, ...windowsErrs });
    if (general || windowsErrs.duration || windowsErrs.cancel_window_days || windowsErrs.reschedule_window_days) {
      setError(general || windowsErrs.duration || 'Corrija os erros antes de salvar.');
      return;
    }
    for (const k of Object.keys(dayErrors || {})) {
      if (dayErrors[Number(k)]) {
        setError('Corrija os erros por dia antes de salvar.');
        return;
      }
    }
    try {
      setSaving(true);
      setError(null);
      // Enviar apenas os campos em DIAS (mais os campos que continuam iguais)
      // O backend espera day_of_week (0..6) e open_time/close_time em HH:MM; enviar apenas dias abertos.
      const bhToSend = sanitizedHours
        .filter((h) => h.open && h.close)
        .map((h) => ({ day_of_week: h.day, open_time: h.open, close_time: h.close }));
      const payload: any = {
        duration_minutes: form.duration_minutes,
        business_hours: bhToSend,
        cancel_window_days: form.cancel_window_days === 0 ? null : form.cancel_window_days,
        reschedule_window_days: form.reschedule_window_days === 0 ? null : form.reschedule_window_days,
      };
      console.log('Enviando PATCH config:', JSON.stringify(payload, null, 2));
      // Send and then reload canonical config from server to ensure persistence
      await patchBarbeariaConfig(barbeariaId, payload);
      const fresh = await getBarbeariaConfig(barbeariaId);
      setForm({
        duration_minutes: fresh.duration_minutes ?? 30,
        cancel_window_days: typeof fresh.cancel_window_days === 'number' ? fresh.cancel_window_days : null,
        reschedule_window_days: typeof fresh.reschedule_window_days === 'number' ? fresh.reschedule_window_days : null,
        business_hours: (fresh.business_hours || []).map((h, idx) => ({ day: typeof h.day === 'number' ? h.day : idx, open: h.open ?? null, close: h.close ?? null })),
      } as BarbeariaConfig);
      setSuccess('Configurações salvas com sucesso.');
    } catch (e: any) {
      // Mapear mensagens e fieldErrors do backend para erros inline quando possível
      const backendData = e?.data ?? e?.response?.data;
      const backendMsg = backendData?.message || backendData?.error || e?.message;
      // Reset dayErrors
      const newDayErrors: Record<number, string | null> = {};
      // backend pode retornar .errors = [{ path, message }] ou fieldErrors (Zod)
      if (Array.isArray(backendData?.errors)) {
        for (const it of backendData.errors) {
          const path = it?.path;
          const msg = it?.message || String(it);
          if (Array.isArray(path) && path[0] === 'business_hours' && typeof path[1] === 'number') {
            newDayErrors[path[1]] = msg;
          } else if (typeof path === 'string') {
            // tenta extrair índice com regex como business_hours[2] ou business_hours.2
            const m = path.match(/business_hours\W*(\d+)/);
            if (m) newDayErrors[Number(m[1])] = msg;
          }
        }
      }
      // fieldErrors: pode ser objeto em forma de { business_hours: [null, { open_time: ['msg'] }, ... ] }
      if (backendData?.fieldErrors && typeof backendData.fieldErrors === 'object') {
        const fe = backendData.fieldErrors;
        if (fe.business_hours && Array.isArray(fe.business_hours)) {
          // eslint-disable-next-line @typescript-eslint/no-explicit-any
          fe.business_hours.forEach((entry: any, idx: number) => {
            if (!entry) return;
            // entry pode ser array de mensagens ou objeto com chaves
            if (typeof entry === 'string') {
              newDayErrors[idx] = entry;
            } else if (Array.isArray(entry) && entry.length > 0) {
              newDayErrors[idx] = String(entry[0]);
            } else if (typeof entry === 'object') {
              // pega primeira mensagem encontrada
              const v = Object.values(entry)[0];
              if (Array.isArray(v) && v.length > 0) newDayErrors[idx] = String(v[0]);
              else if (typeof v === 'string') newDayErrors[idx] = v;
            }
          });
        }
      }
      // aplica os erros coletados
      setFormErrors((prev) => ({ ...(prev || {}), dayErrors: { ...(prev?.dayErrors || {}), ...newDayErrors } }));
      setError(backendMsg || 'Falha ao salvar.');
    } finally {
      setSaving(false);
    }
  }

  const submitDisabled = saving || loading || hasValidationErrors();

  return (
    <div className="min-h-screen bg-gradient-to-br from-gray-950 via-gray-900 to-black py-8 px-4">
      <div className="max-w-6xl mx-auto">
        {/* Header com gradiente melhorado */}
        <div className="relative bg-gradient-to-br from-gray-800/50 via-gray-900/50 to-gray-800/50 backdrop-blur-sm rounded-3xl shadow-2xl p-8 mb-8 border border-gray-700/50 overflow-hidden">
          <div className="absolute top-0 right-0 w-96 h-96 bg-gradient-to-br from-amber-500/20 to-yellow-500/10 rounded-full blur-3xl"></div>
          <div className="absolute bottom-0 left-0 w-64 h-64 bg-gradient-to-tr from-yellow-500/15 to-amber-500/10 rounded-full blur-3xl"></div>

          <div className="relative z-10">
            <button
              onClick={() => navigate('/dashboard')}
              className="mb-6 flex items-center gap-2 text-amber-400 hover:text-amber-300 transition-all hover:-translate-x-1 group"
            >
              <svg className="w-5 h-5 transform group-hover:scale-110 transition-transform" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 19l-7-7 7-7" />
              </svg>
              <span className="text-sm font-semibold">Voltar ao Dashboard</span>
            </button>

            <div className="flex items-center gap-4 mb-4">
              <div className="w-16 h-16 bg-gradient-to-br from-amber-500 to-yellow-600 rounded-2xl flex items-center justify-center shadow-lg">
                <svg className="w-8 h-8 text-white" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                  <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                </svg>
              </div>
              <div>
                <h1 className="text-4xl font-extrabold text-transparent bg-clip-text bg-gradient-to-r from-amber-400 via-yellow-300 to-amber-500">
                  Configurações de Horário
                </h1>
                <p className="text-gray-300 text-sm mt-1">Configure duração de serviços, prazos e horário de funcionamento</p>
              </div>
            </div>
          </div>
        </div>

        {/* Formulário */}
        <div className="space-y-6" style={{ animation: 'fadeInUp 420ms ease' }}>
          {loading ? (
            <div className="bg-gray-800/50 backdrop-blur-sm rounded-2xl shadow-xl p-12 border border-gray-700/50 text-center">
              <div className="inline-block w-12 h-12 border-4 border-amber-500 border-t-transparent rounded-full animate-spin mb-4"></div>
              <p className="text-gray-300">Carregando configurações...</p>
            </div>
          ) : (
            <form onSubmit={onSubmit} className="space-y-6">
              {/* Alertas */}
              {error && (
                <div className="rounded-xl bg-red-500/10 border border-red-500/30 p-4 backdrop-blur-sm">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-red-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4m0 4h.01M21 12a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-red-200 text-sm font-medium">{error}</p>
                  </div>
                </div>
              )}
              {success && (
                <div className="rounded-xl bg-green-500/10 border border-green-500/30 p-4 backdrop-blur-sm animate-[fadeIn_300ms_ease]">
                  <div className="flex items-start gap-3">
                    <svg className="w-6 h-6 text-green-400 flex-shrink-0 mt-0.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
                    </svg>
                    <p className="text-green-200 text-sm font-medium">{success}</p>
                  </div>
                </div>
              )}

              {/* Card: Configurações Gerais */}
              <div className="bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <div className="flex items-center gap-3 mb-6">
                  <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                    <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
                      <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
                    </svg>
                  </div>
                  <h2 className="text-xl font-bold text-white">Configurações Gerais</h2>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-3 gap-6">
                  <div>
                    <label className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M12 8v4l3 3m6-3a9 9 0 11-18 0 9 9 0 0118 0z" />
                      </svg>
                      Duração mínima (min)
                    </label>
                    <input
                      type="number"
                      min={5}
                      step={5}
                      value={form.duration_minutes}
                      onChange={(e) => updateField('duration_minutes', Number(e.target.value))}
                      className="block w-full rounded-xl bg-gray-900/50 border border-gray-600/50 text-white px-4 py-3 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      required
                    />
                    <p className="mt-2 text-xs text-gray-400">Tempo padrão por serviço</p>
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-red-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                      </svg>
                      Prazo cancelamento (dias)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.cancel_window_days ?? ''}
                      onChange={(e) => updateField('cancel_window_days', e.target.value === '' ? null : Number(e.target.value))}
                      className="block w-full rounded-xl bg-gray-900/50 border border-gray-600/50 text-white px-4 py-3 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      placeholder="0 = sem prazo"
                    />
                    <p className="mt-2 text-xs text-gray-400">Antecedência para cancelar</p>
                    {formErrors?.cancel_window_days && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.cancel_window_days}</p>
                    )}
                  </div>

                  <div>
                    <label className="text-sm font-semibold text-gray-200 mb-2 flex items-center gap-2">
                      <svg className="w-4 h-4 text-blue-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7h12m0 0l-4-4m4 4l-4 4m0 6H4m0 0l4 4m-4-4l4-4" />
                      </svg>
                      Prazo reagendamento (dias)
                    </label>
                    <input
                      type="number"
                      min={0}
                      step={1}
                      value={form.reschedule_window_days ?? ''}
                      onChange={(e) => updateField('reschedule_window_days', e.target.value === '' ? null : Number(e.target.value))}
                      className="block w-full rounded-xl bg-gray-900/50 border border-gray-600/50 text-white px-4 py-3 shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                      placeholder="0 = sem prazo"
                    />
                    <p className="mt-2 text-xs text-gray-400">Antecedência para reagendar</p>
                    {formErrors?.reschedule_window_days && (
                      <p className="mt-1 text-xs text-red-400">{formErrors.reschedule_window_days}</p>
                    )}
                  </div>
                </div>
              </div>

              {/* Card: Horários de Funcionamento */}
              <div className="bg-gradient-to-br from-gray-800/80 via-gray-800/60 to-gray-800/80 backdrop-blur-sm rounded-2xl shadow-xl p-6 border border-gray-700/50">
                <div className="flex items-center justify-between mb-6">
                  <div className="flex items-center gap-3">
                    <div className="w-10 h-10 bg-amber-500/20 rounded-lg flex items-center justify-center">
                      <svg className="w-5 h-5 text-amber-400" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
                      </svg>
                    </div>
                    <div>
                      <h2 className="text-xl font-bold text-white">Horário de Funcionamento</h2>
                      <p className="text-xs text-gray-400 mt-0.5">Configure os horários para cada dia da semana</p>
                    </div>
                  </div>
                </div>

                <div className="grid grid-cols-1 md:grid-cols-2 lg:grid-cols-3 xl:grid-cols-4 gap-4">
                  {form.business_hours.map((h) => (
                    <div 
                      key={h.day} 
                      className="bg-gray-900/50 border border-gray-700/50 rounded-xl p-4 hover:border-amber-500/30 transition-all hover:shadow-lg hover:shadow-amber-500/5"
                    >
                      <div className="flex items-center justify-between mb-3">
                        <span className="text-sm font-bold text-amber-400">{dayLabels[h.day]}</span>
                        {h.open && h.close && (
                          <span className="text-xs bg-green-500/20 text-green-400 px-2 py-1 rounded-full">Aberto</span>
                        )}
                      </div>
                      
                      <div className="space-y-3">
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5">Abertura</label>
                          <input
                            type="time"
                            value={h.open ?? ''}
                            onChange={(e) => updateHour(h.day, 'open', e.target.value)}
                            className="block w-full rounded-lg bg-gray-800/50 border border-gray-600/50 text-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                          />
                        </div>
                        <div>
                          <label className="block text-xs font-medium text-gray-400 mb-1.5">Fechamento</label>
                          <input
                            type="time"
                            value={h.close ?? ''}
                            onChange={(e) => updateHour(h.day, 'close', e.target.value)}
                            className="block w-full rounded-lg bg-gray-800/50 border border-gray-600/50 text-white px-3 py-2 text-sm shadow-sm focus:border-amber-500 focus:ring-2 focus:ring-amber-500/20 transition-all"
                          />
                        </div>
                      </div>

                      <div className="mt-4 pt-3 border-t border-gray-700/50">
                        <button
                          type="button"
                          onClick={() => applyToWeekdays(h.day)}
                          className="w-full text-xs text-amber-400 hover:text-amber-300 font-medium flex items-center justify-center gap-1.5 py-2 hover:bg-amber-500/10 rounded-lg transition-all"
                          title="Copiar este horário para todos os dias úteis"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                            <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
                          </svg>
                          Aplicar nos dias úteis
                        </button>
                        <p className="text-xs text-gray-500 text-center mt-2">Deixe vazio se fechado</p>
                      </div>
                    </div>
                  ))}
                </div>
              </div>

              {/* Botões de ação */}
              <div className="flex flex-col sm:flex-row justify-end gap-4">
                <Link
                  to="/dashboard"
                  className="px-6 py-3 rounded-xl text-sm font-semibold border bg-gray-800/80 text-white border-gray-600/50 hover:bg-gray-700/80 transition-all flex items-center justify-center gap-2"
                >
                  <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                    <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M6 18L18 6M6 6l12 12" />
                  </svg>
                  Cancelar
                </Link>
                <button
                  type="submit"
                  disabled={submitDisabled}
                  className={`px-8 py-3 rounded-xl text-sm font-bold transition-all flex items-center justify-center gap-2 ${
                    submitDisabled
                      ? 'bg-gray-700 text-gray-500 cursor-not-allowed'
                      : 'bg-gradient-to-r from-amber-500 to-yellow-600 hover:from-amber-600 hover:to-yellow-700 text-white shadow-lg hover:shadow-amber-500/25 hover:-translate-y-0.5'
                  }`}
                >
                  {saving ? (
                    <>
                      <div className="w-4 h-4 border-2 border-white border-t-transparent rounded-full animate-spin"></div>
                      Salvando...
                    </>
                  ) : (
                    <>
                      <svg className="w-4 h-4" fill="none" viewBox="0 0 24 24" stroke="currentColor">
                        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth={2} d="M5 13l4 4L19 7" />
                      </svg>
                      Salvar Configurações
                    </>
                  )}
                </button>
              </div>
            </form>
          )}
        </div>
      </div>

    </div>
  );
};

export default BarbershopConfig;
