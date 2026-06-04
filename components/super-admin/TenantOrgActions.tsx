'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import {
  toggleOrganizationStateAction,
} from '@/lib/services/super-admin-actions';
import { startImpersonationAction } from '@/lib/services/impersonation-actions';
import { Eye, Lock, Unlock, Loader2 } from 'lucide-react';

interface TenantOrgActionsProps {
  organizationId: string;
  organizationName: string;
  isSuspended: boolean;
}

export default function TenantOrgActions({
  organizationId,
  organizationName,
  isSuspended,
}: TenantOrgActionsProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [showImpersonate, setShowImpersonate] = useState(false);
  const [reason, setReason] = useState('');
  const [error, setError] = useState<string | null>(null);

  const handleToggle = () => {
    const nextSuspended = !isSuspended;
    const msg = nextSuspended
      ? `Suspend "${organizationName}"? Staff will lose access.`
      : `Reactivate "${organizationName}"?`;
    if (!window.confirm(msg)) return;

    startTransition(async () => {
      const res = await toggleOrganizationStateAction(organizationId, nextSuspended);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || 'Failed to update tenant state');
      }
    });
  };

  const handleImpersonate = () => {
    startTransition(async () => {
      const res = await startImpersonationAction({
        organizationId,
        reason: reason.trim(),
      });
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.error || 'Impersonation failed');
      }
    });
  };

  return (
    <div className="flex flex-wrap items-center justify-end gap-2">
      {error && (
        <span className="text-[10px] text-destructive w-full text-right">{error}</span>
      )}
      <button
        type="button"
        disabled={isPending}
        onClick={handleToggle}
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-outline-variant text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high disabled:opacity-60"
      >
        {isSuspended ? (
          <>
            <Unlock className="w-3.5 h-3.5 text-secondary" />
            Activate
          </>
        ) : (
          <>
            <Lock className="w-3.5 h-3.5 text-destructive" />
            Suspend
          </>
        )}
      </button>
      <button
        type="button"
        disabled={isPending}
        onClick={() => setShowImpersonate((v) => !v)}
        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-primary/30 text-primary hover:bg-primary/10 disabled:opacity-60"
      >
        <Eye className="w-3.5 h-3.5" />
        Impersonate
      </button>

      {showImpersonate && (
        <div className="w-full mt-2 p-3 glass rounded-xl space-y-2 text-left">
          <p className="text-[10px] text-on-surface-variant">
            Audited read/write as clinic admin for {organizationName}.
          </p>
          <input
            type="text"
            value={reason}
            onChange={(e) => setReason(e.target.value)}
            placeholder="Reason (required, min 3 chars)"
            className="w-full px-2 py-1.5 text-xs bg-surface-container border border-outline-variant rounded-lg text-on-surface"
          />
          <button
            type="button"
            disabled={isPending || reason.trim().length < 3}
            onClick={handleImpersonate}
            className="w-full py-2 rounded-lg bg-primary/20 text-primary text-[10px] font-bold flex items-center justify-center gap-1 disabled:opacity-50"
          >
            {isPending ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
            Start impersonation
          </button>
        </div>
      )}
    </div>
  );
}
