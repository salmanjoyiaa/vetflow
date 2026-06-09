'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import {
  confirmAppointmentAction,
  checkInAppointmentAction,
  cancelAppointmentAction,
  markNoShowAppointmentAction,
  rescheduleAppointmentAction,
  markAppointmentEmergencyAction,
} from '@/lib/services/appointment-actions';
import {
  Calendar,
  CheckCircle2,
  UserCheck,
  XCircle,
  Loader2,
  Search,
  Filter,
  AlertTriangle,
} from 'lucide-react';
import { useRouter } from 'next/navigation';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  patient_name: string;
  patient_species: string | null;
  preferred_date: string;
  preferred_time: string;
  reason: string;
  status: string;
  is_emergency?: boolean;
  intake_notes?: string | null;
  doctor_id?: string | null;
}

const STATUS_OPTIONS = [
  'all',
  'requested',
  'confirmed',
  'checked_in',
  'rescheduled',
  'completed',
  'cancelled',
  'no_show',
] as const;

interface AppointmentsListClientProps {
  initialAppointments: Appointment[];
  doctors: Doctor[];
}

function emergencyBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
      <AlertTriangle className="w-3 h-3" />
      EMERGENCY
    </span>
  );
}

function statusBadge(status: string) {
  const map: Record<string, { label: string; className: string }> = {
    requested: { label: 'Requested', className: 'bg-amber-500/10 text-amber-700' },
    confirmed: { label: 'Confirmed', className: 'bg-primary/10 text-primary' },
    checked_in: { label: 'Checked in', className: 'bg-emerald-500/10 text-emerald-600' },
    rescheduled: { label: 'Rescheduled', className: 'bg-secondary/10 text-secondary' },
    completed: { label: 'Completed', className: 'bg-emerald-500/10 text-emerald-700' },
    cancelled: { label: 'Cancelled', className: 'bg-destructive/10 text-destructive' },
    no_show: { label: 'No show', className: 'bg-outline-variant/30 text-on-surface-variant' },
  };
  const s = map[status] ?? { label: status, className: 'bg-surface-container text-on-surface-variant' };
  return (
    <span className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${s.className}`}>
      {status === 'checked_in' && <CheckCircle2 className="w-3 h-3" />}
      {status === 'cancelled' && <XCircle className="w-3 h-3" />}
      {s.label}
    </span>
  );
}

export default function AppointmentsListClient({
  initialAppointments,
  doctors,
}: AppointmentsListClientProps) {
  const router = useRouter();
  useVisibilityPolling(20000, true);
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDoctorMap, setSelectedDoctorMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const [dateFilter, setDateFilter] = useState('');
  const [search, setSearch] = useState('');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [checkInNotice, setCheckInNotice] = useState(false);

  const filtered = useMemo(() => {
    const list = initialAppointments.filter((appt) => {
      if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
      if (dateFilter && appt.preferred_date !== dateFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${appt.customer_name} ${appt.patient_name} ${appt.customer_phone} ${appt.reason} ${appt.intake_notes || ''}`.toLowerCase();
        if (!hay.includes(q)) return false;
      }
      return true;
    });
    return [...list].sort((a, b) => {
      const aEm = a.is_emergency ? 1 : 0;
      const bEm = b.is_emergency ? 1 : 0;
      if (bEm !== aEm) return bEm - aEm;
      return `${a.preferred_date} ${a.preferred_time}`.localeCompare(
        `${b.preferred_date} ${b.preferred_time}`
      );
    });
  }, [initialAppointments, statusFilter, dateFilter, search]);

  const runAction = async (
    id: string,
    fn: () => Promise<{ success: boolean; error?: string }>,
    onSuccess?: () => void
  ) => {
    setUpdatingId(id);
    try {
      const res = await fn();
      if (res.success) {
        onSuccess?.();
        router.refresh();
      } else {
        alert(res.error || 'Action failed');
      }
    } catch (err: unknown) {
      alert(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleRescheduleSubmit = async (apptId: string) => {
    if (!rescheduleDate || !rescheduleTime) {
      alert('Enter date and time');
      return;
    }
    await runAction(apptId, () =>
      rescheduleAppointmentAction({
        appointmentId: apptId,
        preferredDate: rescheduleDate,
        preferredTime: rescheduleTime,
      })
    );
    setRescheduleId(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  if (initialAppointments.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center shadow-premium">
        <Calendar className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <h4 className="text-sm font-bold text-on-surface mb-1">No Appointments Requested</h4>
        <p className="text-xs text-on-surface-variant/60">Share your public booking link to receive requests.</p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {checkInNotice && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
          <span className="text-emerald-700 font-semibold">Patient checked in and added to the walk-in queue.</span>
          <Link
            href="/dashboard/walk-ins"
            className="shrink-0 font-bold text-primary hover:underline"
          >
            View walk-in queue →
          </Link>
        </div>
      )}
      <div className="flex flex-col sm:flex-row gap-3">
        <div className="relative flex-1">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
          <input
            type="search"
            placeholder="Search owner, pet, phone, reason..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2 bg-surface-container/40 border border-outline-variant/60 rounded-xl text-xs"
          />
        </div>
        <div className="flex gap-2">
          <select
            value={statusFilter}
            onChange={(e) => setStatusFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container/40 border border-outline-variant/60 rounded-xl text-xs font-semibold"
          >
            {STATUS_OPTIONS.map((s) => (
              <option key={s} value={s}>
                {s === 'all' ? 'All statuses' : s.replace('_', ' ')}
              </option>
            ))}
          </select>
          <input
            type="date"
            value={dateFilter}
            onChange={(e) => setDateFilter(e.target.value)}
            className="px-3 py-2 bg-surface-container/40 border border-outline-variant/60 rounded-xl text-xs"
          />
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-8 text-center text-xs text-on-surface-variant">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No appointments match your filters.
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
                <th className="px-6 py-4">Pet Details</th>
                <th className="px-6 py-4">Owner Contact</th>
                <th className="px-6 py-4">Preferred Slot</th>
                <th className="px-6 py-4">Reason</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {filtered.map((appt) => (
                <tr key={appt.id} className="hover:bg-surface-container/10 transition-colors">
                  <td className="px-6 py-4">
                    <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
                      <span className="font-bold text-on-surface">{appt.patient_name}</span>
                      {appt.is_emergency && emergencyBadge()}
                    </div>
                    <span className="text-[10px] text-on-surface-variant/50 block capitalize">
                      Species: {appt.patient_species || 'Dog'}
                    </span>
                    {appt.intake_notes && (
                      <span className="text-[10px] text-on-surface-variant block mt-1 line-clamp-2" title={appt.intake_notes}>
                        Intake: {appt.intake_notes}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 space-y-0.5 text-on-surface-variant/70">
                    <span className="font-semibold text-on-surface block">{appt.customer_name}</span>
                    <span>{appt.customer_phone}</span>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant/80 font-medium">
                    <div>{appt.preferred_date}</div>
                    <div className="text-[10px] text-on-surface-variant/50">{appt.preferred_time}</div>
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant/80 max-w-xs truncate" title={appt.reason}>
                    {appt.reason}
                  </td>
                  <td className="px-6 py-4">{statusBadge(appt.status)}</td>
                  <td className="px-6 py-4 text-right">
                    <div className="inline-flex flex-col items-end gap-2">
                      {!['checked_in', 'completed', 'cancelled', 'no_show'].includes(appt.status) && (
                        <button
                          type="button"
                          disabled={updatingId !== null}
                          onClick={() =>
                            runAction(appt.id, () =>
                              markAppointmentEmergencyAction({
                                appointmentId: appt.id,
                                isEmergency: !appt.is_emergency,
                              })
                            )
                          }
                          className={`text-[10px] font-bold px-2 py-1 rounded-lg border ${
                            appt.is_emergency
                              ? 'border-destructive/40 text-destructive bg-destructive/10'
                              : 'border-outline-variant text-on-surface-variant'
                          }`}
                        >
                          {appt.is_emergency ? 'Clear emergency' : 'Mark emergency'}
                        </button>
                      )}

                      {appt.status === 'requested' && (
                        <button
                          disabled={updatingId !== null}
                          onClick={() => runAction(appt.id, () => confirmAppointmentAction(appt.id))}
                          className="bg-primary text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                        >
                          {updatingId === appt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                        </button>
                      )}

                      {['confirmed', 'rescheduled'].includes(appt.status) && (
                        <>
                          <div className="flex items-center gap-2">
                            <select
                              className="px-2 py-1 bg-surface-container border border-outline-variant rounded-lg text-[10px]"
                              value={
                                selectedDoctorMap[appt.id] ||
                                appt.doctor_id ||
                                doctors[0]?.id ||
                                ''
                              }
                              onChange={(e) =>
                                setSelectedDoctorMap({ ...selectedDoctorMap, [appt.id]: e.target.value })
                              }
                            >
                              {doctors.map((d) => (
                                <option key={d.id} value={d.id}>
                                  Dr. {d.firstName} {d.lastName}
                                </option>
                              ))}
                            </select>
                            <button
                              disabled={updatingId !== null}
                              onClick={() =>
                                runAction(
                                  appt.id,
                                  () =>
                                    checkInAppointmentAction(
                                      appt.id,
                                      selectedDoctorMap[appt.id] ||
                                        appt.doctor_id ||
                                        doctors[0]?.id ||
                                        ''
                                    ),
                                  () => setCheckInNotice(true)
                                )
                              }
                              className="bg-primary text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1"
                            >
                              <UserCheck className="w-3 h-3" />
                              Check-in
                            </button>
                          </div>
                          <div className="flex gap-1">
                            <button
                              type="button"
                              onClick={() => {
                                setRescheduleId(appt.id);
                                setRescheduleDate(appt.preferred_date);
                                setRescheduleTime(appt.preferred_time);
                              }}
                              className="text-[10px] text-primary font-bold hover:underline"
                            >
                              Reschedule
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Mark as no-show?')) {
                                  runAction(appt.id, () => markNoShowAppointmentAction(appt.id));
                                }
                              }}
                              className="text-[10px] text-on-surface-variant font-bold hover:underline"
                            >
                              No-show
                            </button>
                            <button
                              type="button"
                              onClick={() => {
                                if (confirm('Cancel this appointment?')) {
                                  runAction(appt.id, () => cancelAppointmentAction(appt.id));
                                }
                              }}
                              className="text-[10px] text-destructive font-bold hover:underline"
                            >
                              Cancel
                            </button>
                          </div>
                        </>
                      )}

                      {rescheduleId === appt.id && (
                        <div className="flex items-center gap-1 p-2 bg-surface-container/30 rounded-lg">
                          <input
                            type="date"
                            value={rescheduleDate}
                            onChange={(e) => setRescheduleDate(e.target.value)}
                            className="text-[10px] px-1 py-0.5 border rounded"
                          />
                          <input
                            type="time"
                            value={rescheduleTime}
                            onChange={(e) => setRescheduleTime(e.target.value)}
                            className="text-[10px] px-1 py-0.5 border rounded"
                          />
                          <button
                            type="button"
                            onClick={() => handleRescheduleSubmit(appt.id)}
                            className="text-[10px] font-bold text-primary"
                          >
                            Save
                          </button>
                        </div>
                      )}

                      {['checked_in', 'completed', 'cancelled', 'no_show'].includes(appt.status) && (
                        <span className="text-[10px] text-on-surface-variant/40 italic">Closed</span>
                      )}
                    </div>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      )}
    </div>
  );
}
