'use client';

import { useState, useTransition } from 'react';
import Link from 'next/link';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';
import { globalClinicSearchAction } from '@/lib/services/search-actions';
import ConsultTimer from '@/components/dashboard/ConsultTimer';
import VisitStatusBadge from '@/components/dashboard/VisitStatusBadge';
import {
  BriefcaseMedical,
  Play,
  ClipboardList,
  User,
  AlertTriangle,
  Search,
  Loader2,
} from 'lucide-react';

interface Visit {
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
  pet: { id: string; name: string; species: string; breed: string | null; gender: string };
  customer: { firstName: string; lastName: string; phone: string };
}

interface DoctorQueueClientProps {
  waitingVisits: Visit[];
  consultingVisits: Visit[];
  doctorFirstName: string;
  doctorLastName: string;
  showConsultTimer: boolean;
}

export default function DoctorQueueClient({
  waitingVisits,
  consultingVisits,
  doctorFirstName,
  doctorLastName,
  showConsultTimer,
}: DoctorQueueClientProps) {
  useVisibilityPolling(15000, true);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Array<{ type: string; title: string; subtitle: string; href: string }>
  >([]);
  const [isSearching, startSearch] = useTransition();

  const handleSearch = (q: string) => {
    setSearchQuery(q);
    if (q.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    startSearch(async () => {
      const res = await globalClinicSearchAction({ query: q.trim() });
      if (res.success && res.results) {
        setSearchResults(
          res.results
            .filter((r) => r.type === 'pet' || r.type === 'customer')
            .slice(0, 6)
        );
      }
    });
  };

  return (
    <div className="space-y-8">
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
        <label className="block text-[10px] font-bold text-on-surface-variant uppercase mb-2">
          Find patient before taking a case
        </label>
        <div className="relative">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
          <input
            type="search"
            value={searchQuery}
            onChange={(e) => handleSearch(e.target.value)}
            placeholder="Search pet name, owner name, phone..."
            className="w-full pl-9 pr-3 py-2.5 bg-surface-container/40 border border-outline-variant/60 rounded-xl text-xs"
          />
          {isSearching && (
            <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
          )}
        </div>
        {searchResults.length > 0 && (
          <div className="mt-2 border border-outline-variant/40 rounded-xl overflow-hidden divide-y divide-outline-variant/20">
            {searchResults.map((r) => (
              <Link
                key={`${r.type}-${r.href}`}
                href={r.href}
                className="block px-4 py-2.5 hover:bg-surface-container/40 transition-colors"
              >
                <span className="text-xs font-bold text-on-surface">{r.title}</span>
                <span className="text-[10px] text-on-surface-variant block">{r.subtitle}</span>
              </Link>
            ))}
          </div>
        )}
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        <div className="md:col-span-8 space-y-6">
          <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
            <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <Play className="w-4 h-4 text-primary fill-current" />
                Active Consultations ({consultingVisits.length})
              </h3>
            </div>

            {consultingVisits.length > 0 ? (
              <div className="divide-y divide-border/20">
                {consultingVisits.map((v) => (
                  <div key={v.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2 flex-wrap">
                        <span className="font-bold text-base text-on-surface">{v.pet.name}</span>
                        {v.isEmergency && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            <AlertTriangle className="w-3 h-3" />
                            EMERGENCY
                          </span>
                        )}
                        {showConsultTimer && v.consultStartedAt && (
                          <ConsultTimer
                            startedAt={v.consultStartedAt}
                            pausedAt={v.consultPausedAt}
                            accumulatedPauseSec={v.consultPauseAccumulatedSec ?? 0}
                          />
                        )}
                        <VisitStatusBadge
                          status={v.status}
                          pause={{
                            consultPausedAt: v.consultPausedAt,
                            consultPauseReason: v.consultPauseReason,
                          }}
                          showPauseReason
                        />
                      </div>
                      {v.triageNotes && (
                        <p className="text-[11px] text-on-surface-variant/80 bg-surface-container/40 rounded-lg px-2 py-1.5 line-clamp-2">
                          Intake: {v.triageNotes}
                        </p>
                      )}
                      <div className="text-xs text-on-surface-variant/70 space-y-1">
                        <p className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary/60" />
                          Owner: {v.customer.firstName} {v.customer.lastName}
                        </p>
                        <p className="font-semibold text-on-surface">
                          Reason: <span className="font-normal text-on-surface-variant/80">{v.reason}</span>
                        </p>
                      </div>
                    </div>
                    <Link
                      href={`/dashboard/doctors/${v.id}`}
                      className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all"
                    >
                      Open Workspace
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-on-surface-variant/50 italic">
                No consultations currently in progress. Open a patient from the queue below to start.
              </div>
            )}
          </div>

          <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
            <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                Waiting Queue ({waitingVisits.length})
              </h3>
            </div>

            {waitingVisits.length > 0 ? (
              <div className="divide-y divide-border/20">
                {waitingVisits.map((v) => (
                  <div key={v.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <div className="flex flex-wrap items-center gap-2">
                        <span className="font-bold text-sm text-on-surface">{v.pet.name}</span>
                        {v.isEmergency && (
                          <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            <AlertTriangle className="w-3 h-3" />
                            EMERGENCY
                          </span>
                        )}
                        <Link
                          href={`/dashboard/doctors/patients/${v.pet.id}`}
                          className="text-[10px] text-primary font-bold hover:underline"
                        >
                          View history
                        </Link>
                      </div>
                      <p className="text-xs text-on-surface-variant/70">
                        Owner: {v.customer.firstName} {v.customer.lastName} · {v.pet.species}
                      </p>
                      <p className="text-xs font-semibold text-on-surface">
                        Reason: <span className="font-normal text-on-surface-variant/80">{v.reason}</span>
                      </p>
                    </div>
                    <Link
                      href={`/dashboard/doctors/${v.id}`}
                      className="border border-primary-teal/30 hover:bg-primary/5 text-primary px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                    >
                      Start Consult
                      <Play className="w-3.5 h-3.5 fill-current" />
                    </Link>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-on-surface-variant/50 italic">
                Your assigned waiting queue is empty.
              </div>
            )}
          </div>
        </div>

        <div className="md:col-span-4 glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-6">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
            <BriefcaseMedical className="w-4 h-4 text-primary" />
            Workspace Summary
          </h3>
          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between text-on-surface-variant/70 border-b border-outline-variant/30 pb-2">
              <span className="font-semibold text-on-surface">Attending Doctor</span>
              <span className="font-bold text-primary">
                Dr. {doctorFirstName} {doctorLastName}
              </span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant/70 border-b border-outline-variant/30 pb-2">
              <span className="font-semibold text-on-surface">Active Consults</span>
              <span>{consultingVisits.length}</span>
            </div>
            <div className="flex items-center justify-between text-on-surface-variant/70">
              <span className="font-semibold text-on-surface">Waiting in Queue</span>
              <span>{waitingVisits.length}</span>
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
