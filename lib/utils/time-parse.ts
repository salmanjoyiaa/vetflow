/** Normalize Postgres TIME / ISO / HH:MM strings to minutes since midnight. */
export function parseAppointmentTimeToMinutes(raw: string | null | undefined): number | null {
  if (!raw) return null;
  const value = raw.trim();
  if (!value) return null;

  // ISO datetime (e.g. 1970-01-01T09:00:00+00:00)
  const tIndex = value.indexOf('T');
  const timeSegment = tIndex >= 0 ? value.slice(tIndex + 1) : value;

  // Strip timezone / fractional seconds
  const core = timeSegment.split(/[Z+-]/)[0]?.split('.')[0] ?? '';
  const parts = core.split(':');
  if (parts.length < 2) return null;

  const hours = Number.parseInt(parts[0], 10);
  const minutes = Number.parseInt(parts[1], 10);
  if (Number.isNaN(hours) || Number.isNaN(minutes)) return null;
  if (hours < 0 || hours > 23 || minutes < 0 || minutes > 59) return null;

  return hours * 60 + minutes;
}

/** Display-friendly HH:MM from assorted time formats. */
export function formatAppointmentTime(raw: string | null | undefined): string {
  const minutes = parseAppointmentTimeToMinutes(raw);
  if (minutes == null) return raw?.trim() || '—';
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  return `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}`;
}

/** Normalize DATE strings to YYYY-MM-DD for comparisons. */
export function normalizeDateYmd(raw: string | null | undefined): string {
  if (!raw) return '';
  const value = raw.trim();
  if (/^\d{4}-\d{2}-\d{2}$/.test(value)) return value;
  const datePart = value.slice(0, 10);
  if (/^\d{4}-\d{2}-\d{2}$/.test(datePart)) return datePart;
  const parsed = new Date(value);
  if (Number.isNaN(parsed.getTime())) return value;
  const y = parsed.getFullYear();
  const mo = String(parsed.getMonth() + 1).padStart(2, '0');
  const d = String(parsed.getDate()).padStart(2, '0');
  return `${y}-${mo}-${d}`;
}
