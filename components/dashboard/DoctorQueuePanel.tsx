'use client';

import Link from 'next/link';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';
import ConsultTimer from '@/components/dashboard/ConsultTimer';
import VisitStatusBadge from '@/components/dashboard/VisitStatusBadge';
import {
  Play,
  ClipboardList,
  AlertTriangle,
  ArrowRight,
} from 'lucide-react';

export type DoctorQueueVisit = {
  id: string;
  reason: string;
  status: string;
  checkedInAt: string;
  consultStartedAt?: string | null;
  consultPausedAt?: string | null;
  consultPauseReason?: string | null;
  consultPauseAccumulatedSec?: number;
  isEmergency: boolean;
  triageNotes: string | null;
  pet: { id: string; name: string; species: string; breed: string | null };
  customer: { firstName: string; lastName: string };
};

interface DoctorQueuePanelProps {
  waitingVisits: DoctorQueueVisit[];
  consultingVisits: DoctorQueueVisit[];
  showConsultTimer?: boolean;
  compact?: boolean;
  showViewAllLink?: boolean;
}

function fmtTime(iso: string): string {
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function DoctorQueuePanel({
  waitingVisits,
  consultingVisits,
  showConsultTimer = false,
  compact = false,
  showViewAllLink = true,
}: DoctorQueuePanelProps) {
  useVisibilityPolling(compact ? 15000 : 0, compact);

  const total = waitingVisits.length + consultingVisits.length;

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
      <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20 flex items-center justify-between gap-3">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
          <ClipboardList className="w-4 h-4 text-primary" />
          My patient queue
          <span className="text-on-surface-variant font-semibold normal-case">({total})</span>
        </h3>
        {showViewAllLink && (
          <Link
            href="/dashboard/doctors"
            className="text-[10px] font-bold text-primary hover:underline inline-flex items-center gap-1"
          >
            Full workspace
            <ArrowRight className="w-3 h-3" />
          </Link>
        )}
      </div>

      {total === 0 ? (
        <p className="p-8 text-center text-xs text-on-surface-variant italic">
          No patients assigned to you right now.
        </p>
      ) : (
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
                <th className="px-5 py-3">Patient / Owner</th>
                <th className="px-5 py-3">Reason</th>
                <th className="px-5 py-3">Arrived</th>
                <th className="px-5 py-3">Status</th>
                <th className="px-5 py-3 text-right">Action</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20">
              {[...consultingVisits, ...waitingVisits].map((v) => {
                const consulting = v.status === 'consulting';
                return (
                  <tr key={v.id} className="hover:bg-surface-container/10 transition-colors">
                    <td className="px-5 py-3">
                      <span className="font-bold text-on-surface block flex items-center gap-2 flex-wrap">
                        {v.pet.name}
                        {v.isEmergency && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-destructive/15 text-destructive">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            ER
                          </span>
                        )}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        {v.customer.firstName} {v.customer.lastName} · {v.pet.species}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant max-w-[140px] truncate">
                      {v.reason}
                    </td>
                    <td className="px-5 py-3 text-on-surface-variant whitespace-nowrap">
                      {fmtTime(v.checkedInAt)}
                    </td>
                    <td className="px-5 py-3">
                      <span className="inline-flex items-center gap-1.5 flex-wrap">
                        <VisitStatusBadge
                          status={v.status}
                          pause={{
                            consultPausedAt: v.consultPausedAt,
                            consultPauseReason: v.consultPauseReason,
                          }}
                        />
                        {consulting && showConsultTimer && v.consultStartedAt && (
                          <ConsultTimer
                            startedAt={v.consultStartedAt}
                            pausedAt={v.consultPausedAt}
                            accumulatedPauseSec={v.consultPauseAccumulatedSec ?? 0}
                          />
                        )}
                      </span>
                    </td>
                    <td className="px-5 py-3 text-right">
                      <Link
                        href={`/dashboard/doctors/${v.id}`}
                        className={`inline-flex items-center gap-1 px-3 py-1.5 rounded-lg text-[10px] font-bold transition-all ${
                          consulting
                            ? 'bg-primary text-white hover:opacity-90'
                            : 'border border-primary/30 text-primary hover:bg-primary/5'
                        }`}
                      >
                        {consulting ? 'Open' : 'Start'}
                        <Play className="w-3 h-3 fill-current" />
                      </Link>
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
