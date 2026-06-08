'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { forceEndImpersonationAction } from '@/lib/services/impersonation-actions';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import { tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import { Loader2, Radio, ShieldX } from 'lucide-react';

export type ImpersonationSessionRow = {
  id: string;
  actorName: string;
  targetOrgName: string;
  targetOrgId: string;
  reason: string | null;
  startedAt: string;
  expiresAt: string | null;
};

export default function ImpersonationMonitorClient({
  sessions,
}: {
  sessions: ImpersonationSessionRow[];
}) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [error, setError] = useState<string | null>(null);
  const [endingId, setEndingId] = useState<string | null>(null);

  const onForceEnd = (id: string) => {
    if (!window.confirm('Force-end this impersonation session now?')) return;
    setError(null);
    setEndingId(id);
    startTransition(async () => {
      const res = await forceEndImpersonationAction({ sessionId: id });
      setEndingId(null);
      if (res.success) {
        router.refresh();
      } else {
        setError(res.error || 'Failed to end session.');
      }
    });
  };

  return (
    <div className="space-y-4">
      <div className="flex items-center gap-2">
        <Radio className={`w-4 h-4 ${sessions.length > 0 ? 'text-destructive animate-pulse' : 'text-on-surface-variant'}`} />
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
          Active impersonation sessions ({sessions.length})
        </h3>
      </div>

      {error && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}

      <GlassPanel className="p-0 overflow-hidden">
        {sessions.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-6 py-4">Actor</th>
                  <th className="px-6 py-4">Target clinic</th>
                  <th className="px-6 py-4">Reason</th>
                  <th className="px-6 py-4">Started</th>
                  <th className="px-6 py-4">Expires</th>
                  <th className="px-6 py-4 text-right">Action</th>
                </tr>
              </thead>
              <tbody>
                {sessions.map((s) => (
                  <tr key={s.id} className={tableRowClass}>
                    <td className="px-6 py-4 font-semibold text-on-surface">{s.actorName}</td>
                    <td className="px-6 py-4 text-on-surface">{s.targetOrgName}</td>
                    <td className="px-6 py-4 text-on-surface-variant max-w-[200px] truncate">
                      {s.reason || '—'}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {new Date(s.startedAt).toLocaleString()}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {s.expiresAt ? new Date(s.expiresAt).toLocaleString() : '—'}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <button
                        type="button"
                        disabled={isPending}
                        onClick={() => onForceEnd(s.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
                      >
                        {isPending && endingId === s.id ? (
                          <Loader2 className="w-3.5 h-3.5 animate-spin" />
                        ) : (
                          <ShieldX className="w-3.5 h-3.5" />
                        )}
                        Force end
                      </button>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant text-center py-12">
            No active impersonation sessions.
          </p>
        )}
      </GlassPanel>
    </div>
  );
}
