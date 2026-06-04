'use client';

import { useEffect } from 'react';
import { AlertTriangle } from 'lucide-react';

export default function DashboardError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  useEffect(() => {
    console.error(error);
  }, [error]);

  return (
    <div className="glass-panel p-8 text-center max-w-lg mx-auto">
      <AlertTriangle className="w-10 h-10 text-destructive mx-auto mb-4" />
      <h2 className="text-sm font-bold text-on-surface mb-2">Something went wrong</h2>
      <p className="text-xs text-on-surface-variant mb-6">{error.message}</p>
      <button
        type="button"
        onClick={reset}
        className="text-xs font-bold px-4 py-2 rounded-xl bg-primary/20 text-primary hover:bg-primary/30"
      >
        Try again
      </button>
    </div>
  );
}
