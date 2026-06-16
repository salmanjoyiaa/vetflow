export type DateFilterPreset = 'today' | 'tomorrow' | 'week' | 'custom';

export function formatDateYmd(d: Date): string {
  const y = d.getFullYear();
  const m = String(d.getMonth() + 1).padStart(2, '0');
  const day = String(d.getDate()).padStart(2, '0');
  return `${y}-${m}-${day}`;
}

export function parseDateYmd(value: string): Date | null {
  if (!/^\d{4}-\d{2}-\d{2}$/.test(value)) return null;
  const d = new Date(`${value}T12:00:00`);
  return Number.isNaN(d.getTime()) ? null : d;
}

export function startOfToday(): Date {
  const d = new Date();
  d.setHours(12, 0, 0, 0);
  return d;
}

export function addDaysToDate(base: Date, days: number): Date {
  const d = new Date(base);
  d.setDate(d.getDate() + days);
  return d;
}

export function resolveDateFromParam(param: string | null | undefined): string {
  if (param && parseDateYmd(param)) return param;
  return formatDateYmd(startOfToday());
}

export function getDateRangeForPreset(
  preset: DateFilterPreset,
  customDate: string
): { from: string; to: string } {
  const today = startOfToday();
  if (preset === 'today') {
    const d = formatDateYmd(today);
    return { from: d, to: d };
  }
  if (preset === 'tomorrow') {
    const d = formatDateYmd(addDaysToDate(today, 1));
    return { from: d, to: d };
  }
  if (preset === 'week') {
    return {
      from: formatDateYmd(today),
      to: formatDateYmd(addDaysToDate(today, 6)),
    };
  }
  const d = parseDateYmd(customDate) ? customDate : formatDateYmd(today);
  return { from: d, to: d };
}

export function formatDisplayDate(ymd: string): string {
  const d = parseDateYmd(ymd);
  if (!d) return ymd;
  return d.toLocaleDateString(undefined, {
    weekday: 'short',
    month: 'short',
    day: 'numeric',
    year: 'numeric',
  });
}
