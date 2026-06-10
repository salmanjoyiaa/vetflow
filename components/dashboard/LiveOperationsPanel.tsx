'use client';

import Link from 'next/link';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';
import ConsultTimer from '@/components/dashboard/ConsultTimer';
import { Stethoscope, User, AlertTriangle, BadgeCheck } from 'lucide-react';

export type LiveConsultRow = {
  id: string;
  status: string;
  reason: string;
  consultStartedAt: string | null;
  checkedInAt: string;
  petName: string;
  petSpecies: string;
  customerName: string;
  doctorName: string;
  isEmergency: boolean;
};

interface LiveOperationsPanelProps {
  activeConsults: LiveConsultRow[];
  readyForCheckout: LiveConsultRow[];
  showConsultTimer: boolean;
}

function statusLabel(status: string) {
  switch (status) {
    case 'consulting':
      return 'Consultation in progress';
    case 'waiting':
      return 'Waiting in queue';
    case 'ready_for_checkout':
      return 'Ready for checkout';
    default:
      return status.replace(/_/g, ' ');
  }
}

export default function LiveOperationsPanel({
  activeConsults,
  readyForCheckout,
  showConsultTimer,
}: LiveOperationsPanelProps) {
  useVisibilityPolling(15000, true);

  const hasActivity = activeConsults.length > 0 || readyForCheckout.length > 0;

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
      <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20 flex items-center justify-between">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
          <Stethoscope className="w-4 h-4 text-primary" />
          Live Operations
        </h3>
        <span className="text-[10px] font-bold text-on-surface-variant">
          {activeConsults.length} active · {readyForCheckout.length} checkout
        </span>
      </div>

      {!hasActivity ? (
        <div className="p-8 text-center text-xs text-on-surface-variant/50 italic">
          No active consultations right now. Updates every 15 seconds.
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/20">
          {activeConsults.map((v) => (
            <div key={v.id} className="px-5 py-4 flex items-center justify-between gap-4 hover:bg-surface-container/20">
              <div className="space-y-1">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className="text-xs font-bold text-on-surface">{v.petName}</span>
                  {v.isEmergency && (
                    <span className="inline-flex items-center gap-1 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-destructive/15 text-destructive">
                      <AlertTriangle className="w-2.5 h-2.5" />
                      EMERGENCY
                    </span>
                  )}
                  {showConsultTimer && v.consultStartedAt && v.status === 'consulting' && (
                    <ConsultTimer startedAt={v.consultStartedAt} />
                  )}
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  <User className="w-3 h-3 inline mr-1" />
                  {v.customerName} · {v.doctorName}
                </p>
                <p className="text-[10px] text-blue-400 font-semibold">{statusLabel(v.status)}</p>
              </div>
              {v.status === 'consulting' && (
                <Link
                  href={`/dashboard/doctors/${v.id}`}
                  className="text-[10px] font-bold text-primary hover:underline shrink-0"
                >
                  View →
                </Link>
              )}
            </div>
          ))}

          {readyForCheckout.map((v) => (
            <div
              key={`checkout-${v.id}`}
              className="px-5 py-4 flex items-center justify-between gap-4 bg-emerald-500/5 border-l-2 border-emerald-500"
            >
              <div className="space-y-1">
                <div className="flex items-center gap-2">
                  <BadgeCheck className="w-4 h-4 text-emerald-500" />
                  <span className="text-xs font-bold text-on-surface">{v.petName} — ready for checkout</span>
                </div>
                <p className="text-[10px] text-on-surface-variant">
                  {v.customerName} · {v.doctorName}
                </p>
              </div>
              <Link
                href={`/dashboard/invoices/create/${v.id}`}
                className="bg-emerald-600 text-white px-3 py-1.5 rounded-lg text-[10px] font-bold shrink-0"
              >
                Checkout
              </Link>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
