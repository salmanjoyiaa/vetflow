'use client';

import { createContext, useCallback, useContext, useMemo, type ReactNode } from 'react';
import {
  formatMoney,
  normalizeCurrencyCode,
  type FormatMoneyOptions,
} from '@/lib/utils/currency';

type CurrencyContextValue = {
  currency: string;
  formatCurrency: (amount: number, options?: FormatMoneyOptions) => string;
};

const CurrencyContext = createContext<CurrencyContextValue>({
  currency: 'USD',
  formatCurrency: (amount, options) => formatMoney(amount, 'USD', options),
});

export function CurrencyProvider({
  currency,
  children,
}: {
  currency: string;
  children: ReactNode;
}) {
  const normalized = normalizeCurrencyCode(currency);
  const formatCurrency = useCallback(
    (amount: number, options?: FormatMoneyOptions) =>
      formatMoney(amount, normalized, options),
    [normalized]
  );

  const value = useMemo(
    () => ({ currency: normalized, formatCurrency }),
    [normalized, formatCurrency]
  );

  return <CurrencyContext.Provider value={value}>{children}</CurrencyContext.Provider>;
}

export function useCurrency(): CurrencyContextValue {
  return useContext(CurrencyContext);
}
