'use client';

import { AlertTriangle } from 'lucide-react';

export default function SuperAdminError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  const isConfigError =
    error.message?.includes('SUPABASE') ||
    error.message?.includes('service role') ||
    error.message?.includes('Invalid API key');

  return (
    <div className="bg-white rounded-2xl border border-destructive/20 p-8 shadow-premium max-w-lg">
      <div className="flex items-center gap-3 mb-4">
        <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center">
          <AlertTriangle className="w-5 h-5 text-destructive" />
        </div>
        <div>
          <h2 className="text-sm font-bold text-primary-navy">Platform console unavailable</h2>
          <p className="text-xs text-graphite/60 mt-0.5">
            {isConfigError
              ? 'Check that SUPABASE_SERVICE_ROLE_KEY is set in your environment.'
              : 'The platform dashboard could not load. Please try again.'}
          </p>
        </div>
      </div>
      {error.message && (
        <p className="text-[10px] text-graphite/50 mb-4 font-mono bg-primary-ivory rounded-lg p-3">
          {error.message}
        </p>
      )}
      <button
        onClick={reset}
        className="bg-primary-teal hover:bg-primary-teal/90 text-white px-4 py-2.5 rounded-xl text-xs font-semibold transition-colors"
      >
        Try again
      </button>
    </div>
  );
}
