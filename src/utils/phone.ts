export const onlyDigits = (s: string) => (s || '').replace(/\D/g, '');

export function formatPhoneBR(s: string) {
  const d = onlyDigits(s).slice(0, 11);
  if (d.length === 0) return '';
  if (d.length <= 2) return d;
  if (d.length <= 6) return `(${d.slice(0,2)}) ${d.slice(2)}`;
  if (d.length <= 10) return `(${d.slice(0,2)}) ${d.slice(2,6)}-${d.slice(6)}`;
  return `(${d.slice(0,2)}) ${d.slice(2,7)}-${d.slice(7)}`;
}

export function isValidPhoneBR(s: string) {
  const d = onlyDigits(s);
  return d.length === 10 || d.length === 11;
}

export function normalizePhoneToDigits(s: string) {
  return onlyDigits(s) || undefined;
}
