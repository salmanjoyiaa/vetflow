export type FormatMoneyOptions = {
  decimals?: number;
  compact?: boolean;
};

const CURRENCY_LOCALE: Record<string, string> = {
  USD: 'en-US',
  PKR: 'en-PK',
  EUR: 'de-DE',
  GBP: 'en-GB',
  AED: 'en-AE',
  SAR: 'ar-SA',
  INR: 'en-IN',
  CAD: 'en-CA',
  AUD: 'en-AU',
};

export function normalizeCurrencyCode(code: string | null | undefined): string {
  const normalized = (code || 'USD').trim().toUpperCase();
  return /^[A-Z]{3}$/.test(normalized) ? normalized : 'USD';
}

export function getCurrencyLocale(currency: string): string {
  const code = normalizeCurrencyCode(currency);
  return CURRENCY_LOCALE[code] ?? 'en-US';
}

export function formatMoney(
  amount: number,
  currency: string,
  options: FormatMoneyOptions = {}
): string {
  const code = normalizeCurrencyCode(currency);
  const value = Number.isFinite(amount) ? amount : 0;
  const decimals = options.decimals ?? 2;

  try {
    const locale = getCurrencyLocale(code);
    return new Intl.NumberFormat(locale, {
      style: 'currency',
      currency: code,
      minimumFractionDigits: decimals,
      maximumFractionDigits: decimals,
      notation: options.compact ? 'compact' : 'standard',
    }).format(value);
  } catch {
    return `${code} ${value.toFixed(decimals)}`;
  }
}
