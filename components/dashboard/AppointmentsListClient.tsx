'use client';

import { useMemo, useState, useEffect } from 'react';
import Link from 'next/link';
import {
  confirmAppointmentAction,
  checkInAppointmentAction,
  cancelAppointmentAction,
  markNoShowAppointmentAction,
  rescheduleAppointmentAction,
  updateAppointmentDetailsAction,
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
  CalendarClock,
  User,
  RotateCcw,
} from 'lucide-react';
import { useRouter, useSearchParams } from 'next/navigation';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';
import DateRangeQuickFilter from '@/components/dashboard/DateRangeQuickFilter';
import { resolveDateFromParam } from '@/lib/utils/date-filters';

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
  created_by?: string | null;
  created_by_role?: string | null;
  creatorName?: string | null;
  follow_up_of_visit_id?: string | null;
}

type TabKey = 'upcoming' | 'emergency' | 'closed';

const UPCOMING_STATUSES = ['requested', 'confirmed', 'rescheduled'];
const CLOSED_STATUSES = ['checked_in', 'completed', 'cancelled', 'no_show'];

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
  userRole?: string | null;
}

function emergencyBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-destructive/15 text-destructive border border-destructive/30">
      <AlertTriangle className="w-3 h-3" />
      EMERGENCY
    </span>
  );
}

function followUpBadge() {
  return (
    <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-secondary/15 text-secondary border border-secondary/30">
      <RotateCcw className="w-3 h-3" />
      FOLLOW-UP
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

function formatRole(role: string | null | undefined) {
  if (!role) return 'Staff';
  return role.replace(/_/g, ' ').replace(/\b\w/g, (c) => c.toUpperCase());
}

function getDateGroup(dateStr: string): string {
  const today = new Date();
  today.setHours(0, 0, 0, 0);
  const tomorrow = new Date(today);
  tomorrow.setDate(tomorrow.getDate() + 1);
  const weekEnd = new Date(today);
  weekEnd.setDate(weekEnd.getDate() + 7);

  const d = new Date(dateStr + 'T00:00:00');
  if (d < today) return 'Overdue';
  if (d.getTime() === today.getTime()) return 'Today';
  if (d.getTime() === tomorrow.getTime()) return 'Tomorrow';
  if (d < weekEnd) return 'This Week';
  return 'Later';
}

const GROUP_ORDER = ['Overdue', 'Today', 'Tomorrow', 'This Week', 'Later'];

interface AppointmentRowProps {
  appt: Appointment;
  doctors: Doctor[];
  updatingId: string | null;
  selectedDoctorMap: Record<string, string>;
  setSelectedDoctorMap: (m: Record<string, string>) => void;
  rescheduleId: string | null;
  setRescheduleId: (id: string | null) => void;
  rescheduleDate: string;
  setRescheduleDate: (v: string) => void;
  rescheduleTime: string;
  setRescheduleTime: (v: string) => void;
  runAction: (
    id: string,
    fn: () => Promise<{ success: boolean; error?: string }>,
    onSuccess?: () => void
  ) => Promise<void>;
  onCheckIn: () => void;
  userRole?: string | null;
  editId: string | null;
  setEditId: (id: string | null) => void;
  editReason: string;
  setEditReason: (v: string) => void;
  editDate: string;
  setEditDate: (v: string) => void;
  editTime: string;
  setEditTime: (v: string) => void;
}

function AppointmentRow({
  appt,
  doctors,
  updatingId,
  selectedDoctorMap,
  setSelectedDoctorMap,
  rescheduleId,
  setRescheduleId,
  rescheduleDate,
  setRescheduleDate,
  rescheduleTime,
  setRescheduleTime,
  runAction,
  onCheckIn,
  userRole,
  editId,
  setEditId,
  editReason,
  setEditReason,
  editDate,
  setEditDate,
  editTime,
  setEditTime,
}: AppointmentRowProps) {
  const isClosed = CLOSED_STATUSES.includes(appt.status);
  const isAdmin = userRole === 'clinic_admin';
  const canManageOpen =
    ['confirmed', 'rescheduled'].includes(appt.status) ||
    (isAdmin && appt.status === 'requested');

  const handleRescheduleSubmit = async () => {
    if (!rescheduleDate || !rescheduleTime) {
      alert('Enter date and time');
      return;
    }
    await runAction(appt.id, () =>
      rescheduleAppointmentAction({
        appointmentId: appt.id,
        preferredDate: rescheduleDate,
        preferredTime: rescheduleTime,
      })
    );
    setRescheduleId(null);
    setRescheduleDate('');
    setRescheduleTime('');
  };

  const handleEditSubmit = async () => {
    if (!editReason.trim()) {
      alert('Reason is required');
      return;
    }
    await runAction(appt.id, () =>
      updateAppointmentDetailsAction({
        appointmentId: appt.id,
        reason: editReason.trim(),
        preferredDate: editDate || undefined,
        preferredTime: editTime || undefined,
      })
    );
    setEditId(null);
  };

  return (
    <tr className="hover:bg-surface-container/10 transition-colors">
      <td className="px-6 py-4">
        <div className="flex flex-wrap items-center gap-1.5 mb-0.5">
          <span className="font-bold text-on-surface">{appt.patient_name}</span>
          {appt.is_emergency && emergencyBadge()}
          {appt.follow_up_of_visit_id && followUpBadge()}
        </div>
        <span className="text-[10px] text-on-surface-variant/50 block capitalize">
          {appt.patient_species || 'Dog'}
        </span>
        {appt.creatorName && (
          <span className="text-[10px] text-on-surface-variant/60 flex items-center gap-1 mt-1">
            <User className="w-3 h-3" />
            Booked by {appt.creatorName} ({formatRole(appt.created_by_role)})
          </span>
        )}
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
        <div className="flex items-center gap-1.5">
          <CalendarClock className="w-3.5 h-3.5 text-primary/50" />
          <div>
            <div>{appt.preferred_date}</div>
            <div className="text-[10px] text-on-surface-variant/50">{appt.preferred_time}</div>
          </div>
        </div>
      </td>
      <td className="px-6 py-4 text-on-surface-variant/80 max-w-xs truncate" title={appt.reason}>
        {appt.reason}
      </td>
      <td className="px-6 py-4">{statusBadge(appt.status)}</td>
      <td className="px-6 py-4 text-right">
        {isClosed ? (
          <span className="text-[10px] text-on-surface-variant/40 italic">Closed</span>
        ) : (
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
              <>
                <button
                  disabled={updatingId !== null}
                  onClick={() => runAction(appt.id, () => confirmAppointmentAction(appt.id))}
                  className="bg-primary text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold"
                >
                  {updatingId === appt.id ? <Loader2 className="w-3 h-3 animate-spin" /> : 'Approve'}
                </button>
                {isAdmin && (
                  <button
                    type="button"
                    onClick={() => {
                      setEditId(appt.id);
                      setEditReason(appt.reason);
                      setEditDate(appt.preferred_date);
                      setEditTime(appt.preferred_time);
                    }}
                    className="text-[10px] text-primary font-bold hover:underline"
                  >
                    Edit details
                  </button>
                )}
              </>
            )}

            {canManageOpen && (
              <>
                <div className="flex items-center gap-2">
                  <select
                    className="px-2 py-1 bg-surface-container border border-outline-variant rounded-lg text-[10px]"
                    value={selectedDoctorMap[appt.id] || appt.doctor_id || doctors[0]?.id || ''}
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
                            selectedDoctorMap[appt.id] || appt.doctor_id || doctors[0]?.id || ''
                          ),
                        onCheckIn
                      )
                    }
                    className="bg-primary text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold flex items-center gap-1 disabled:opacity-60"
                  >
                    {updatingId === appt.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : (
                      <UserCheck className="w-3 h-3" />
                    )}
                    {updatingId === appt.id ? 'Checking in…' : 'Check-in'}
                  </button>
                </div>
                <div className="flex gap-2">
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
                  {isAdmin && (
                    <button
                      type="button"
                      onClick={() => {
                        setEditId(appt.id);
                        setEditReason(appt.reason);
                        setEditDate(appt.preferred_date);
                        setEditTime(appt.preferred_time);
                      }}
                      className="text-[10px] text-primary font-bold hover:underline"
                    >
                      Edit details
                    </button>
                  )}
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
                <button type="button" onClick={handleRescheduleSubmit} className="text-[10px] font-bold text-primary">
                  Save
                </button>
              </div>
            )}

            {editId === appt.id && (
              <div className="flex flex-col gap-2 p-2 bg-surface-container/30 rounded-lg min-w-[200px]">
                <input
                  type="text"
                  value={editReason}
                  onChange={(e) => setEditReason(e.target.value)}
                  placeholder="Reason"
                  className="text-[10px] px-2 py-1 border rounded w-full"
                />
                <div className="flex gap-1">
                  <input
                    type="date"
                    value={editDate}
                    onChange={(e) => setEditDate(e.target.value)}
                    className="text-[10px] px-1 py-0.5 border rounded flex-1"
                  />
                  <input
                    type="time"
                    value={editTime}
                    onChange={(e) => setEditTime(e.target.value)}
                    className="text-[10px] px-1 py-0.5 border rounded flex-1"
                  />
                </div>
                <button type="button" onClick={handleEditSubmit} className="text-[10px] font-bold text-primary text-left">
                  Save details
                </button>
              </div>
            )}
          </div>
        )}
      </td>
    </tr>
  );
}

export default function AppointmentsListClient({
  initialAppointments,
  doctors,
  userRole,
}: AppointmentsListClientProps) {
  const router = useRouter();
  const searchParams = useSearchParams();
  useVisibilityPolling(20000, true);
  const [activeTab, setActiveTab] = useState<TabKey>('upcoming');
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDoctorMap, setSelectedDoctorMap] = useState<Record<string, string>>({});
  const [statusFilter, setStatusFilter] = useState<string>('all');
  const urlDate = searchParams.get('date');
  const [dateFilter, setDateFilter] = useState(() =>
    urlDate ? resolveDateFromParam(urlDate) : ''
  );
  const [search, setSearch] = useState('');
  const [rescheduleId, setRescheduleId] = useState<string | null>(null);
  const [rescheduleDate, setRescheduleDate] = useState('');
  const [rescheduleTime, setRescheduleTime] = useState('');
  const [editId, setEditId] = useState<string | null>(null);
  const [editReason, setEditReason] = useState('');
  const [editDate, setEditDate] = useState('');
  const [editTime, setEditTime] = useState('');
  const [checkInNotice, setCheckInNotice] = useState(false);
  const [actionError, setActionError] = useState<string | null>(null);

  useEffect(() => {
    if (urlDate) {
      setDateFilter(resolveDateFromParam(urlDate));
    }
  }, [urlDate]);

  const tabCounts = useMemo(() => ({
    upcoming: initialAppointments.filter((a) => UPCOMING_STATUSES.includes(a.status)).length,
    emergency: initialAppointments.filter(
      (a) => a.is_emergency && !CLOSED_STATUSES.includes(a.status)
    ).length,
    closed: initialAppointments.filter((a) => CLOSED_STATUSES.includes(a.status)).length,
  }), [initialAppointments]);

  const filtered = useMemo(() => {
    const list = initialAppointments.filter((appt) => {
      if (activeTab === 'upcoming' && !UPCOMING_STATUSES.includes(appt.status)) return false;
      if (activeTab === 'emergency' && (!appt.is_emergency || CLOSED_STATUSES.includes(appt.status)))
        return false;
      if (activeTab === 'closed' && !CLOSED_STATUSES.includes(appt.status)) return false;
      if (statusFilter !== 'all' && appt.status !== statusFilter) return false;
      if (dateFilter && appt.preferred_date !== dateFilter) return false;
      if (search.trim()) {
        const q = search.toLowerCase();
        const hay = `${appt.customer_name} ${appt.patient_name} ${appt.customer_phone} ${appt.reason} ${appt.intake_notes || ''} ${appt.creatorName || ''}`.toLowerCase();
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
  }, [initialAppointments, activeTab, statusFilter, dateFilter, search]);

  const grouped = useMemo(() => {
    const groups = new Map<string, Appointment[]>();
    for (const appt of filtered) {
      const key = getDateGroup(appt.preferred_date);
      if (!groups.has(key)) groups.set(key, []);
      groups.get(key)!.push(appt);
    }
    return GROUP_ORDER.filter((g) => groups.has(g)).map((g) => ({
      label: g,
      items: groups.get(g)!,
    }));
  }, [filtered]);

  const runAction = async (
    id: string,
    fn: () => Promise<{ success: boolean; error?: string }>,
    onSuccess?: () => void
  ) => {
    setUpdatingId(id);
    setActionError(null);
    try {
      const res = await fn();
      if (res.success) {
        onSuccess?.();
        router.refresh();
      } else {
        setActionError(res.error || 'Action failed');
      }
    } catch (err: unknown) {
      setActionError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  if (initialAppointments.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center shadow-premium">
        <Calendar className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <h4 className="text-sm font-bold text-on-surface mb-1">No Appointments Yet</h4>
        <p className="text-xs text-on-surface-variant/60">Share your public booking link or create a new appointment.</p>
      </div>
    );
  }

  const tabs: { key: TabKey; label: string; count: number }[] = [
    { key: 'upcoming', label: 'Upcoming', count: tabCounts.upcoming },
    { key: 'emergency', label: 'Emergency', count: tabCounts.emergency },
    { key: 'closed', label: 'Closed', count: tabCounts.closed },
  ];

  return (
    <div className="space-y-4">
      {actionError && (
        <div className="p-3 rounded-xl bg-destructive/5 border border-destructive/20 text-destructive text-xs">
          {actionError}
        </div>
      )}
      {checkInNotice && (
        <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-emerald-500/10 border border-emerald-500/30 text-xs">
          <span className="text-emerald-700 font-semibold">Patient checked in and added to the walk-in queue.</span>
          <Link href="/dashboard/walk-ins" className="shrink-0 font-bold text-primary hover:underline">
            View walk-in queue →
          </Link>
        </div>
      )}

      <div className="flex gap-1 p-1 bg-surface-container/40 rounded-xl border border-outline-variant/40">
        {tabs.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`flex-1 px-4 py-2.5 rounded-lg text-xs font-bold transition-all ${
              activeTab === tab.key
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant hover:bg-surface-container/60'
            }`}
          >
            {tab.label}
            <span className={`ml-1.5 px-1.5 py-0.5 rounded-full text-[10px] ${
              activeTab === tab.key ? 'bg-white/20' : 'bg-surface-container'
            }`}>
              {tab.count}
            </span>
          </button>
        ))}
      </div>

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
          <DateRangeQuickFilter showWeek={false} className="flex-1" />
          {dateFilter && (
            <button
              type="button"
              onClick={() => setDateFilter('')}
              className="text-[10px] font-bold text-on-surface-variant underline"
            >
              Clear date
            </button>
          )}
        </div>
      </div>

      {filtered.length === 0 ? (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-8 text-center text-xs text-on-surface-variant">
          <Filter className="w-8 h-8 mx-auto mb-2 opacity-40" />
          No appointments match your filters.
        </div>
      ) : (
        <div className="space-y-6">
          {grouped.map((group) => (
            <div key={group.label} className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
              <div className="sticky top-0 z-10 px-6 py-3 bg-surface-container/60 border-b border-outline-variant/40 flex items-center justify-between">
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">{group.label}</h3>
                <span className="text-[10px] font-bold text-on-surface-variant bg-surface-container px-2 py-0.5 rounded-full">
                  {group.items.length}
                </span>
              </div>
              <table className="w-full text-left border-collapse">
                <thead>
                  <tr className="bg-surface-container/20 border-b border-outline-variant/30 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
                    <th className="px-6 py-3">Pet Details</th>
                    <th className="px-6 py-3">Owner Contact</th>
                    <th className="px-6 py-3">Preferred Slot</th>
                    <th className="px-6 py-3">Reason</th>
                    <th className="px-6 py-3">Status</th>
                    <th className="px-6 py-3 text-right">Actions</th>
                  </tr>
                </thead>
                <tbody className="divide-y divide-border/30 text-xs">
                  {group.items.map((appt) => (
                    <AppointmentRow
                      key={appt.id}
                      appt={appt}
                      doctors={doctors}
                      updatingId={updatingId}
                      selectedDoctorMap={selectedDoctorMap}
                      setSelectedDoctorMap={setSelectedDoctorMap}
                      rescheduleId={rescheduleId}
                      setRescheduleId={setRescheduleId}
                      rescheduleDate={rescheduleDate}
                      setRescheduleDate={setRescheduleDate}
                      rescheduleTime={rescheduleTime}
                      setRescheduleTime={setRescheduleTime}
                      runAction={runAction}
                      onCheckIn={() => setCheckInNotice(true)}
                      userRole={userRole}
                      editId={editId}
                      setEditId={setEditId}
                      editReason={editReason}
                      setEditReason={setEditReason}
                      editDate={editDate}
                      setEditDate={setEditDate}
                      editTime={editTime}
                      setEditTime={setEditTime}
                    />
                  ))}
                </tbody>
              </table>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
