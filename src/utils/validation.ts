export function isValidTimeHHMM(v: unknown): boolean {
  if (v == null) return false;
  const s = String(v);
  return /^([01]\d|2[0-3]):[0-5]\d$/.test(s);
}

export function timeToMinutes(v: string): number {
  const [hh, mm] = v.split(':').map((x) => parseInt(x, 10));
  return hh * 60 + mm;
}

export function validateBusinessHoursArray(hours: Array<{ day: number; open: string | null; close: string | null }>) {
  const dayErrors: Record<number, string | null> = {};
  const seen: Record<number, boolean> = {};
  let general: string | null = null;
  for (const h of hours) {
    const d = h.day;
    if (typeof d !== 'number' || d < 0 || d > 6) {
      general = 'Dias devem ser inteiros entre 0 e 6.';
      continue;
    }
    if (seen[d]) {
      dayErrors[d] = 'Dia duplicado.';
      continue;
    }
    seen[d] = true;
    const open = h.open ?? null;
    const close = h.close ?? null;
    if ((open === null) !== (close === null)) {
      dayErrors[d] = 'Ambos horários (abre/fecha) devem estar preenchidos ou ambos vazios.';
      continue;
    }
    if (open !== null && close !== null) {
      if (!isValidTimeHHMM(open)) {
        dayErrors[d] = 'Horário de abertura inválido (use HH:MM).';
        continue;
      }
      if (!isValidTimeHHMM(close)) {
        dayErrors[d] = 'Horário de fechamento inválido (use HH:MM).';
        continue;
      }
      if (timeToMinutes(close) <= timeToMinutes(open)) {
        dayErrors[d] = 'Fechamento deve ser após a abertura.';
        continue;
      }
    }
    dayErrors[d] = null;
  }
  return { general, dayErrors };
}

export function validateWindowsAndDuration(params: { duration_minutes?: number; cancel_window_days?: number | null; reschedule_window_days?: number | null }) {
  const errors: { duration?: string | null; cancel_window_days?: string | null; reschedule_window_days?: string | null } = {};
  const dur = params.duration_minutes;
  if (typeof dur !== 'number' || !Number.isFinite(dur) || dur < 5 || dur > 480) {
    errors.duration = 'Duração deve ser entre 5 e 480 minutos.';
  } else {
    errors.duration = null;
  }
  const checkWindow = (v: number | null | undefined) => {
    if (v == null) return null;
    if (!Number.isInteger(v) || v < 0 || v > 365) return 'Valor deve ser inteiro entre 0 e 365 ou vazio.';
    return null;
  };
  errors.cancel_window_days = checkWindow(params.cancel_window_days);
  errors.reschedule_window_days = checkWindow(params.reschedule_window_days);
  return errors;
}
