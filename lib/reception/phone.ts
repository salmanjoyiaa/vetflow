/** Strip formatting for phone lookup (digits only, keep leading + if present). */
export function normalizePhoneInput(input: string): string {
  const trimmed = input.trim();
  if (trimmed.startsWith('+')) {
    return '+' + trimmed.slice(1).replace(/\D/g, '');
  }
  return trimmed.replace(/\D/g, '');
}

export function looksLikePhone(query: string): boolean {
  const digits = normalizePhoneInput(query).replace(/^\+/, '');
  return digits.length >= 7;
}
