'use client';

import { useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { ShieldAlert, LogOut } from 'lucide-react';
import { endImpersonationAction } from '@/lib/services/impersonation-actions';

interface ImpersonationBannerProps {
  organizationName: string;
}

export default function ImpersonationBanner({ organizationName }: ImpersonationBannerProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();

  const handleEnd = () => {
    startTransition(async () => {
      const res = await endImpersonationAction();
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      }
    });
  };

  return (
    <div className="bg-tertiary/15 border-b border-tertiary/40 px-4 py-2 flex items-center justify-between gap-4 text-xs">
      <div className="flex items-center gap-2 text-tertiary font-semibold">
        <ShieldAlert className="w-4 h-4 shrink-0" />
        <span>
          Impersonating <strong className="text-on-surface">{organizationName}</strong> — actions are
          audited.
        </span>
      </div>
      <button
        type="button"
        disabled={isPending}
        onClick={handleEnd}
        className="shrink-0 flex items-center gap-1.5 px-3 py-1.5 rounded-lg bg-surface-container-high text-on-surface font-bold hover:bg-surface-container-highest transition-colors disabled:opacity-60"
      >
        <LogOut className="w-3.5 h-3.5" />
        Return to platform admin
      </button>
    </div>
  );
}
