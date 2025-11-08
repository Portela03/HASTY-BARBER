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

  return (
    <div className="max-w-4xl mx-auto py-6">
      <div className="mb-6 flex items-center justify-between">
        <h1 className="text-2xl font-semibold">Configurações da Barbearia</h1>
        <Link to="/dashboard" className="text-indigo-600 hover:underline">Voltar</Link>
      </div>

      {loading ? (
        <div className="p-8 text-center">Carregando…</div>
      ) : (
        <form onSubmit={onSubmit} className="space-y-6">
          {error && (
            <div className="rounded-md bg-red-50 p-4 text-red-700 border border-red-200">{error}</div>
          )}
          {success && (
            <div className="rounded-md bg-green-50 p-4 text-green-700 border border-green-200">{success}</div>
          )}

          <div className="grid grid-cols-1 md:grid-cols-3 gap-4">
            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Duração mínima (min)</span>
              <input
                type="number"
                min={5}
                step={5}
                value={form.duration_minutes}
                onChange={(e) => updateField('duration_minutes', Number(e.target.value))}
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                required
              />
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Prazo para cancelar (dias)</span>
              <input
                type="number"
                min={0}
                max={365}
                step={1}
                value={form.cancel_window_days ?? ''}
                onChange={(e) => updateField('cancel_window_days', e.target.value === '' ? null : Math.max(0, Math.min(365, Math.floor(Number(e.target.value) || 0))))}
                placeholder="ex.: 3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">0 significa sem restrição</p>
            </label>

            <label className="block">
              <span className="block text-sm font-medium text-gray-700">Prazo para reagendar (dias)</span>
              <input
                type="number"
                min={0}
                max={365}
                step={1}
                value={form.reschedule_window_days ?? ''}
                onChange={(e) => updateField('reschedule_window_days', e.target.value === '' ? null : Math.max(0, Math.min(365, Math.floor(Number(e.target.value) || 0))))}
                placeholder="ex.: 3"
                className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
              />
              <p className="mt-1 text-xs text-gray-500">0 significa sem restrição</p>
            </label>
          </div>

          <div>
            <h2 className="text-lg font-medium mb-3">Horário de Funcionamento</h2>
            <div className="grid grid-cols-1 sm:grid-cols-2 md:grid-cols-3 gap-4">
              {form.business_hours.map((h) => (
                <div key={h.day} className="border rounded-md p-3">
                  <div className="text-sm font-medium mb-2">{dayLabels[h.day]}</div>
                  <div className="flex items-center gap-2">
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600">Abre</label>
                      <input
                        type="time"
                        value={h.open ?? ''}
                        onChange={(e) => updateHour(h.day, 'open', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                    <div className="flex-1">
                      <label className="block text-xs text-gray-600">Fecha</label>
                      <input
                        type="time"
                        value={h.close ?? ''}
                        onChange={(e) => updateHour(h.day, 'close', e.target.value)}
                        className="mt-1 block w-full rounded-md border-gray-300 shadow-sm focus:border-indigo-500 focus:ring-indigo-500"
                      />
                    </div>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    <p className="text-xs text-gray-500">Deixe vazio para fechado</p>
                    <button
                      type="button"
                      onClick={() => applyToWeekdays(h.day)}
                      className="text-xs text-indigo-600 hover:underline"
                      title="Repetir este horário em Seg–Sex (exceto este dia)"
                    >
                      Repetir nos dias úteis
                    </button>
                  </div>
                  <div className="mt-2 flex items-center justify-between">
                    {h.open && h.close ? (
                      <div className="text-xs text-gray-600">{`${h.open} → ${((() => {
                        const [hh, mm] = h.open.split(':').map((x) => parseInt(x, 10));
                        const dur = Number(form.duration_minutes) || 0;
                        const total = hh * 60 + mm + dur;
                        const endH = Math.floor(total / 60) % 24;
                        const endM = total % 60;
                        return `${String(endH).padStart(2, '0')}:${String(endM).padStart(2, '0')}`;
                      })())}`}</div>
                    ) : (
                      <div />
                    )}
                    <div className="flex gap-2">
                      <button
                        type="button"
                        onClick={() => {
                          // copy this day's hours to ALL days
                          setForm((prev) => ({
                            ...prev,
                            business_hours: prev.business_hours.map((x) => ({ ...x, open: h.open ?? null, close: h.close ?? null })),
                          }));
                        }}
                        className="text-xs text-indigo-600 hover:underline"
                        title="Copiar para todos os dias"
                      >
                        Copiar para todos
                      </button>
                    </div>
                  </div>
                  {formErrors?.dayErrors?.[h.day] ? (
                    <div className="mt-2 text-sm text-red-600">{formErrors.dayErrors[h.day]}</div>
                  ) : null}
                  <div className="mt-1 text-right">
                    <button
                      type="button"
                      onClick={() => setForm((prev) => ({
                        ...prev,
                        business_hours: prev.business_hours.map((x) => x.day === h.day ? { ...x, open: null, close: null } : x)
                      }))}
                      className="text-xs text-gray-600 hover:text-gray-800 hover:underline"
                    >
                      Limpar este dia
                    </button>
                  </div>
                </div>
              ))}
            </div>
          </div>

          <div className="flex justify-end gap-3">
            <Link to="/dashboard" className="px-4 py-2 rounded-md border border-gray-300 text-gray-700">Cancelar</Link>
            <button
              type="submit"
              disabled={saving || loading || hasValidationErrors()}
              className="px-4 py-2 rounded-md bg-indigo-600 text-white hover:bg-indigo-700 disabled:opacity-60"
            >
              {saving ? 'Salvando…' : 'Salvar'}
            </button>
          </div>
        </form>
      )}
    </div>
  );
};

export default BarbershopConfig;
