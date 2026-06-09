'use client';

import { useEffect, useRef, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { createWalkInVisitAction } from '@/lib/services/visit-actions';
import PatientLookupPanel, {
  type SelectedPatient,
} from '@/components/reception/PatientLookupPanel';
import {
  Loader2,
  Clock,
  UserCheck,
  BriefcaseMedical,
  Play,
  ClipboardList,
  AlertTriangle,
  Receipt,
} from 'lucide-react';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface Visit {
  id: string;
  reason: string;
  status: string;
  checkedInAt: string;
  isEmergency?: boolean;
  triageNotes?: string | null;
  pet: { id: string; name: string; species: string; breed: string | null };
  customer: { first_name: string; last_name: string; phone: string };
  doctor: { first_name: string; last_name: string } | null;
}

interface CheckoutVisit {
  id: string;
  reason: string;
  petName: string;
  customerName: string;
}

interface WalkInDashboardClientProps {
  doctors: Doctor[];
  activeBranchId: string;
  initialVisits: Visit[];
  checkoutVisits: CheckoutVisit[];
  highlightIntake?: boolean;
}

export default function WalkInDashboardClient({
  doctors,
  activeBranchId,
  initialVisits,
  checkoutVisits,
  highlightIntake = false,
}: WalkInDashboardClientProps) {
  const router = useRouter();
  const intakeRef = useRef<HTMLDivElement>(null);
  const [selectedPatient, setSelectedPatient] = useState<SelectedPatient | null>(null);

  // Form states
  const [reason, setReason] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [triageNotes, setTriageNotes] = useState('');
  const [doctorId, setDoctorId] = useState(doctors.length > 0 ? doctors[0].id : '');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  useEffect(() => {
    if (highlightIntake && intakeRef.current) {
      intakeRef.current.scrollIntoView({ behavior: 'smooth', block: 'start' });
    }
  }, [highlightIntake]);

  const handleCheckIn = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedPatient || !doctorId || !reason) return;
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createWalkInVisitAction({
        petId: selectedPatient.pet.id,
        customerId: selectedPatient.customer.id,
        doctorId,
        reason,
        branchId: activeBranchId,
        isEmergency,
        triageNotes: triageNotes.trim() || undefined,
      });

      if (res.success) {
        setSelectedPatient(null);
        setReason('');
        setIsEmergency(false);
        setTriageNotes('');
        router.refresh();
      } else {
        setError(res.error || 'Failed to check-in patient');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  // Group visits
  const waitingVisits = initialVisits.filter((v) => v.status === 'waiting');
  const consultingVisits = initialVisits.filter((v) => v.status === 'consulting');

  return (
    <div className="grid md:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: INTAKE & PATIENT SELECTOR */}
      <div className="md:col-span-4 space-y-6">
        
        {/* PATIENT INTAKE CARD */}
        <div
          ref={intakeRef}
          className={`glass-panel rounded-2xl border p-6 shadow-premium ${
            highlightIntake ? 'border-primary/50 ring-2 ring-primary/20' : 'border-outline-variant/40'
          }`}
        >
          <span className="text-[10px] font-black text-primary uppercase tracking-wider block mb-1">
            Intake Console
          </span>
          <h3 className="text-base font-bold text-on-surface mb-4">Patient Check-In</h3>

          {!selectedPatient ? (
            <PatientLookupPanel
              activeBranchId={activeBranchId}
              selected={selectedPatient}
              onSelect={setSelectedPatient}
              onClear={() => setSelectedPatient(null)}
            />
          ) : (
            /* INTAKE FORM (When pet is selected) */
            <form onSubmit={handleCheckIn} className="space-y-4">
              
              {/* Patient brief info card */}
              <div className="bg-surface-container/30 p-3 rounded-xl border border-outline-variant/35 flex items-center justify-between">
                <div>
                  <span className="text-[9px] font-bold text-on-surface-variant/40 uppercase block">Selected Patient</span>
                  <span className="text-xs font-bold text-on-surface">{selectedPatient.pet.name}</span>
                  <span className="text-[10px] text-on-surface-variant/60 block">
                    Owner: {selectedPatient.customer.firstName} {selectedPatient.customer.lastName}
                  </span>
                </div>
                <button
                  type="button"
                  onClick={() => setSelectedPatient(null)}
                  className="text-[10px] text-destructive font-bold hover:underline"
                >
                  Cancel
                </button>
              </div>

              {error && (
                <div className="p-2.5 bg-destructive/5 border border-destructive/20 text-destructive text-[11px] rounded-lg">
                  {error}
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Reason for Visit
                </label>
                <input
                  type="text"
                  placeholder="e.g. Vaccination, skin rash, ear infection"
                  className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
                  value={reason}
                  onChange={(e) => setReason(e.target.value)}
                  required
                />
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Initial history / triage (optional)
                </label>
                <textarea
                  placeholder="Presenting complaint, symptoms, duration..."
                  className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none resize-none"
                  rows={3}
                  value={triageNotes}
                  onChange={(e) => setTriageNotes(e.target.value)}
                />
              </div>

              <label className="flex items-center gap-2 cursor-pointer">
                <input
                  type="checkbox"
                  checked={isEmergency}
                  onChange={(e) => setIsEmergency(e.target.checked)}
                  className="rounded border-outline-variant"
                />
                <AlertTriangle className="w-4 h-4 text-destructive" />
                <span className="text-xs font-bold text-destructive">Mark as emergency</span>
              </label>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Assign Attending Vet
                </label>
                <select
                  className="w-full px-3 py-2 bg-surface-container/20 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface font-semibold outline-none"
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  required
                >
                  {doctors.map((doc) => (
                    <option key={doc.id} value={doc.id}>
                      Dr. {doc.firstName} {doc.lastName}
                    </option>
                  ))}
                </select>
              </div>

              <button
                type="submit"
                disabled={isSubmitting}
                className="w-full bg-primary hover:bg-primary/95 text-white py-2.5 rounded-xl text-xs font-bold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-75"
              >
                {isSubmitting ? (
                  <>
                    <Loader2 className="w-3.5 h-3.5 animate-spin" />
                    Checking in...
                  </>
                ) : (
                  'Check-In Patient'
                )}
              </button>

            </form>
          )}

        </div>

      </div>

      {/* RIGHT: QUEUE MONITOR (WAITING / CONSULTING) */}
      <div className="md:col-span-8 space-y-6">

        {checkoutVisits.length > 0 && (
          <div className="glass-panel rounded-2xl border border-emerald-500/30 overflow-hidden shadow-premium">
            <div className="p-5 border-b border-outline-variant/30 bg-emerald-500/5 flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
                Ready for checkout ({checkoutVisits.length})
              </h3>
            </div>
            <ul className="divide-y divide-border/20">
              {checkoutVisits.map((v) => (
                <li
                  key={v.id}
                  className="px-6 py-4 flex items-center justify-between gap-4 text-xs hover:bg-surface-container/10"
                >
                  <div>
                    <span className="font-bold text-on-surface block">{v.petName}</span>
                    <span className="text-on-surface-variant/60">{v.customerName} · {v.reason}</span>
                  </div>
                  <Link
                    href={`/dashboard/invoices/create/${v.id}`}
                    className="shrink-0 inline-flex items-center gap-1 bg-primary text-white px-3 py-1.5 rounded-lg text-[10px] font-bold hover:bg-primary/95"
                  >
                    <Receipt className="w-3 h-3" />
                    Open checkout hub
                  </Link>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* WAITING QUEUE */}
        <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
          <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20 flex items-center justify-between">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <Clock className="w-4 h-4 text-amber-500" />
              Waiting Queue ({waitingVisits.length})
            </h3>
            <span className="text-[10px] text-on-surface-variant/50 font-semibold">Sorted by arrival time</span>
          </div>

          {waitingVisits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/10 border-b border-outline-variant/40 text-[9px] font-bold text-on-surface/80 uppercase tracking-wider">
                  <th className="px-6 py-3">Patient / Owner</th>
                  <th className="px-6 py-3">Reason</th>
                  <th className="px-6 py-3">Assigned Vet</th>
                  <th className="px-6 py-3">Check-In Time</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-xs">
                {waitingVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-container/10">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-on-surface">{v.pet.name}</span>
                        {v.isEmergency && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-on-surface-variant/60">{(v.pet.species)} • Owner: {v.customer.first_name} {v.customer.last_name}</span>
                      {v.triageNotes && (
                        <span className="text-[10px] text-on-surface-variant block mt-0.5 line-clamp-1" title={v.triageNotes}>
                          Triage: {v.triageNotes}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant/80 font-medium">
                      {v.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-semibold text-on-surface">
                        {v.doctor ? `Dr. ${v.doctor.first_name} ${v.doctor.last_name}` : 'Unassigned'}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant/50 font-semibold">
                      {new Date(v.checkedInAt).toLocaleTimeString(undefined, {
                        hour: '2-digit',
                        minute: '2-digit',
                      })}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-on-surface-variant/50 italic">
              No patients currently waiting.
            </div>
          )}
        </div>

        {/* CONSULTING BOARD */}
        <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
          <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
              <BriefcaseMedical className="w-4 h-4 text-primary" />
              Attending consultations ({consultingVisits.length})
            </h3>
          </div>

          {consultingVisits.length > 0 ? (
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className="bg-surface-container/10 border-b border-outline-variant/40 text-[9px] font-bold text-on-surface/80 uppercase tracking-wider">
                  <th className="px-6 py-3">Patient / Owner</th>
                  <th className="px-6 py-3">attending Vet</th>
                  <th className="px-6 py-3">reason</th>
                  <th className="px-6 py-3">State</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-border/20 text-xs">
                {consultingVisits.map((v) => (
                  <tr key={v.id} className="hover:bg-surface-container/10">
                    <td className="px-6 py-4">
                      <div className="flex flex-wrap items-center gap-1.5">
                        <span className="font-bold text-on-surface">{v.pet.name}</span>
                        {v.isEmergency && (
                          <span className="inline-flex items-center gap-0.5 px-1.5 py-0.5 rounded-full text-[9px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
                            <AlertTriangle className="w-2.5 h-2.5" />
                            EMERGENCY
                          </span>
                        )}
                      </div>
                      <span className="text-[10px] text-on-surface-variant/60">Owner: {v.customer.first_name} {v.customer.last_name}</span>
                    </td>
                    <td className="px-6 py-4">
                      <span className="font-bold text-primary">
                        Dr. {v.doctor?.first_name} {v.doctor?.last_name}
                      </span>
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant/80">
                      {v.reason}
                    </td>
                    <td className="px-6 py-4">
                      <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <Play className="w-2.5 h-2.5 fill-current" />
                        In Consult
                      </span>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          ) : (
            <div className="p-8 text-center text-xs text-on-surface-variant/50 italic">
              No consultations currently active in rooms.
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

