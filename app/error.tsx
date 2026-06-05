'use client';

import { useEffect } from 'react';
import Link from 'next/link';
import { AlertTriangle, Home, LogIn, RefreshCw } from 'lucide-react';

export default function GlobalError({
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
    <main className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-md glass-panel p-8 md:p-10 text-center">
        <div className="w-12 h-12 bg-destructive/15 flex items-center justify-center rounded-2xl mx-auto mb-4">
          <AlertTriangle className="w-6 h-6 text-destructive" />
        </div>
        <h1 className="text-lg font-bold text-on-surface mb-2">Something went wrong</h1>
        <p className="text-xs text-on-surface-variant mb-6">
          VetFlow hit an unexpected error. Try again or return to a safe page.
        </p>
        <div className="flex flex-col gap-2">
          <button
            type="button"
            onClick={reset}
            className="w-full bg-primary text-on-primary py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </button>
          <Link
            href="/"
            className="w-full border border-outline-variant text-on-surface py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high"
          >
            <Home className="w-4 h-4" />
            Back to homepage
          </Link>
          <Link
            href="/login?reauth=1"
            className="w-full border border-outline-variant text-on-surface-variant py-3 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high"
          >
            <LogIn className="w-4 h-4" />
            Sign in
          </Link>
        </div>
      </div>
    </main>
  );
}
