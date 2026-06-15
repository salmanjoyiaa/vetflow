'use client';

import { useCallback, useState } from 'react';

type ActionResult = { success: boolean; error?: string };

export function useAsyncAction<T extends ActionResult>(
  action: () => Promise<T>,
  options?: { onSuccess?: (result: T) => void }
) {
  const [pending, setPending] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const run = useCallback(async () => {
    setPending(true);
    setError(null);
    try {
      const result = await action();
      if (result.success) {
        options?.onSuccess?.(result);
      } else {
        setError(result.error || 'Action failed');
      }
      return result;
    } catch (err: unknown) {
      const message = err instanceof Error ? err.message : 'An unexpected error occurred';
      setError(message);
      return { success: false, error: message } as T;
    } finally {
      setPending(false);
    }
  }, [action, options]);

  const clearError = useCallback(() => setError(null), []);

  return { run, pending, error, clearError };
}
