'use client';

import { Loader2 } from 'lucide-react';
import { useNavigationLoadingOptional } from '@/components/layout/NavigationLoadingProvider';

export default function NavigationLoadingOverlay() {
  const nav = useNavigationLoadingOptional();
  if (!nav?.isNavigating) return null;

  return (
    <div
      className="absolute inset-0 z-30 flex items-center justify-center bg-surface/30 backdrop-blur-md"
      aria-busy="true"
      aria-label="Loading page"
    >
      <div className="flex flex-col items-center gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
          Loading…
        </span>
      </div>
    </div>
  );
}
