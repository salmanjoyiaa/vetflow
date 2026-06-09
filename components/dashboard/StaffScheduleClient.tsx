'use client';

import { useMemo, useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import {
  assignShiftAction,
  deleteShiftAction,
  saveScheduleTemplateAction,
  bulkAssignScheduleTemplateAction,
  generateShiftsFromTemplatesAction,
} from '@/lib/services/attendance-actions';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import { tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import {
  CalendarPlus,
  Loader2,
  Trash2,
  Clock,
  CheckCircle,
  XCircle,
  AlertCircle,
  Users,
  CalendarDays,
} from 'lucide-react';

type StaffOption = { id: string; name: string };
type BranchOption = { id: string; name: string };

export type ShiftRow = {
  id: string;
  staffName: string;
  branchName: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes: string | null;
};

export type AttendanceRow = {
  userId: string;
  staffName: string;
  role: string;
  status: string | null;
  rosterStatus: 'present' | 'late' | 'absent' | 'off' | 'not_scheduled' | 'pending';
  checkInAt: string | null;
  checkOutAt: string | null;
};

export type DayTemplate = {
  weekday: number;
  startTime: string;
  endTime: string;
  isOffDay: boolean;
};

type FormValues = {
  userId: string;
  branchId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes: string;
};

const WEEKDAYS: { weekday: number; label: string }[] = [
  { weekday: 1, label: 'Mon' },
  { weekday: 2, label: 'Tue' },
  { weekday: 3, label: 'Wed' },
  { weekday: 4, label: 'Thu' },
  { weekday: 5, label: 'Fri' },
  { weekday: 6, label: 'Sat' },
  { weekday: 0, label: 'Sun' },
];

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-500/10 text-emerald-600',
  late: 'bg-amber-500/10 text-amber-600',
  absent: 'bg-destructive/10 text-destructive',
  off: 'bg-surface-container text-on-surface-variant',
  not_scheduled: 'bg-surface-container/60 text-on-surface-variant/70',
  pending: 'bg-primary/5 text-primary',
  on_leave: 'bg-surface-container text-on-surface-variant',
};

const ROSTER_LABELS: Record<AttendanceRow['rosterStatus'], string> = {
  present: 'Present',
  late: 'Late',
  absent: 'Absent',
  off: 'Off day',
  not_scheduled: 'Not scheduled',
  pending: 'Scheduled',
};

function defaultWeek(): DayTemplate[] {
  return WEEKDAYS.map(({ weekday }) => ({
    weekday,
    startTime: '09:00',
    endTime: '17:00',
    isOffDay: weekday === 0,
  }));
}

function fmtTime(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function StaffScheduleClient({
  staff,
  branches,
  shifts,
  attendance,
  attendanceDate,
  initialTemplate,
  templateUserId,
  templateBranchId,
}: {
  staff: StaffOption[];
  branches: BranchOption[];
  shifts: ShiftRow[];
  attendance: AttendanceRow[];
  attendanceDate: string;
  initialTemplate?: DayTemplate[];
  templateUserId?: string;
  templateBranchId?: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const [selectedStaffId, setSelectedStaffId] = useState(templateUserId || staff[0]?.id || '');
  const [selectedBranchId, setSelectedBranchId] = useState(
    templateBranchId || branches[0]?.id || ''
  );
  const [weekDays, setWeekDays] = useState<DayTemplate[]>(
    initialTemplate?.length === 7 ? initialTemplate : defaultWeek()
  );
  const [bulkUserIds, setBulkUserIds] = useState<string[]>([]);
  const [savingTemplate, setSavingTemplate] = useState(false);
  const [generating, setGenerating] = useState(false);

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { startTime: '09:00', endTime: '17:00' },
  });

  const present = attendance.filter((a) => a.rosterStatus === 'present' || a.rosterStatus === 'late').length;

  const toggleBulkUser = (id: string) => {
    setBulkUserIds((prev) =>
      prev.includes(id) ? prev.filter((x) => x !== id) : [...prev, id]
    );
  };

  const updateDay = (weekday: number, patch: Partial<DayTemplate>) => {
    setWeekDays((prev) =>
      prev.map((d) => (d.weekday === weekday ? { ...d, ...patch } : d))
    );
  };

  const onSaveTemplate = async () => {
    if (!selectedStaffId || !selectedBranchId) {
      setError('Select a staff member and branch.');
      return;
    }
    setSavingTemplate(true);
    setError(null);
    setSuccess(null);
    const res = await saveScheduleTemplateAction({
      userId: selectedStaffId,
      branchId: selectedBranchId,
      days: weekDays,
    });
    setSavingTemplate(false);
    if (res.success) {
      setSuccess('Weekly schedule saved.');
      router.refresh();
    } else {
      setError(res.error || 'Failed to save template.');
    }
  };

  const onBulkAssign = async () => {
    if (!bulkUserIds.length || !selectedBranchId) {
      setError('Select at least one staff member for bulk assign.');
      return;
    }
    setSavingTemplate(true);
    setError(null);
    setSuccess(null);
    const res = await bulkAssignScheduleTemplateAction({
      userIds: bulkUserIds,
      branchId: selectedBranchId,
      days: weekDays,
    });
    setSavingTemplate(false);
    if (res.success) {
      setSuccess(`Schedule applied to ${res.count} staff.`);
      setBulkUserIds([]);
      router.refresh();
    } else {
      setError(res.error || 'Bulk assign failed.');
    }
  };

  const onGenerateShifts = async () => {
    setGenerating(true);
    setError(null);
    const res = await generateShiftsFromTemplatesAction({ weeksAhead: 2 });
    setGenerating(false);
    if (res.success) {
      setSuccess(`Generated ${res.created} shift(s) for the next 2 weeks.`);
      router.refresh();
    } else {
      setError(res.error || 'Failed to generate shifts.');
    }
  };

  const onAssign = handleSubmit(async (data) => {
    setError(null);
    const res = await assignShiftAction(data);
    if (res.success) {
      reset({ ...data, userId: '', notes: '' });
      router.refresh();
    } else {
      setError(res.error || 'Failed to assign shift.');
    }
  });

  const onDelete = (id: string) => {
    if (!window.confirm('Remove this shift?')) return;
    setDeletingId(id);
    startTransition(async () => {
      const res = await deleteShiftAction(id);
      setDeletingId(null);
      if (res.success) router.refresh();
      else setError(res.error || 'Failed to remove shift.');
    });
  };

  const rosterIcon = useMemo(
    () =>
      ({
        present: CheckCircle,
        late: AlertCircle,
        absent: XCircle,
        off: XCircle,
        not_scheduled: Clock,
        pending: Clock,
      }) as Record<AttendanceRow['rosterStatus'], typeof CheckCircle>,
    []
  );

  return (
    <div className="space-y-8">
      {(error || success) && (
        <div
          className={`text-xs p-3 rounded-xl border ${
            error
              ? 'bg-destructive/5 border-destructive/20 text-destructive'
              : 'bg-emerald-500/5 border-emerald-500/20 text-emerald-600'
          }`}
        >
          {error || success}
        </div>
      )}

      <div className="grid lg:grid-cols-3 gap-6">
        <GlassPanel className="p-5 lg:col-span-2 space-y-5">
          <div className="flex flex-wrap items-center justify-between gap-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <CalendarDays className="w-4 h-4 text-primary" />
              Weekly schedule template
            </h3>
            <button
              type="button"
              onClick={onGenerateShifts}
              disabled={generating}
              className="text-[10px] font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-lg disabled:opacity-60"
            >
              {generating ? <Loader2 className="w-3 h-3 animate-spin inline" /> : 'Generate 2 weeks of shifts'}
            </button>
          </div>

          <div className="grid sm:grid-cols-2 gap-3 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Staff member
              </label>
              <select
                value={selectedStaffId}
                onChange={(e) => setSelectedStaffId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs text-on-surface outline-none"
              >
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Branch
              </label>
              <select
                value={selectedBranchId}
                onChange={(e) => setSelectedBranchId(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs text-on-surface outline-none"
              >
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse text-xs min-w-[520px]">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-3 py-2">Day</th>
                  <th className="px-3 py-2">Start</th>
                  <th className="px-3 py-2">End</th>
                  <th className="px-3 py-2 text-center">Off</th>
                </tr>
              </thead>
              <tbody>
                {WEEKDAYS.map(({ weekday, label }) => {
                  const day = weekDays.find((d) => d.weekday === weekday)!;
                  return (
                    <tr key={weekday} className={tableRowClass}>
                      <td className="px-3 py-2 font-semibold text-on-surface">{label}</td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          disabled={day.isOffDay}
                          value={day.startTime}
                          onChange={(e) => updateDay(weekday, { startTime: e.target.value })}
                          className="px-2 py-1 bg-surface-container/30 border border-outline-variant rounded-lg text-xs disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-2">
                        <input
                          type="time"
                          disabled={day.isOffDay}
                          value={day.endTime}
                          onChange={(e) => updateDay(weekday, { endTime: e.target.value })}
                          className="px-2 py-1 bg-surface-container/30 border border-outline-variant rounded-lg text-xs disabled:opacity-40"
                        />
                      </td>
                      <td className="px-3 py-2 text-center">
                        <input
                          type="checkbox"
                          checked={day.isOffDay}
                          onChange={(e) => updateDay(weekday, { isOffDay: e.target.checked })}
                          className="rounded border-outline-variant"
                        />
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>

          <div className="flex flex-wrap gap-2">
            <button
              type="button"
              onClick={onSaveTemplate}
              disabled={savingTemplate}
              className="bg-primary hover:opacity-90 text-white px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-70"
            >
              {savingTemplate ? 'Saving…' : 'Save weekly template'}
            </button>
          </div>

          <div className="pt-4 border-t border-outline-variant/30 space-y-3">
            <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <Users className="w-3.5 h-3.5 text-primary" />
              Bulk apply to selected staff
            </h4>
            <div className="flex flex-wrap gap-2">
              {staff.map((s) => (
                <label
                  key={s.id}
                  className={`inline-flex items-center gap-1.5 px-2.5 py-1 rounded-lg text-[10px] font-semibold border cursor-pointer ${
                    bulkUserIds.includes(s.id)
                      ? 'bg-primary/10 border-primary/30 text-primary'
                      : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <input
                    type="checkbox"
                    className="sr-only"
                    checked={bulkUserIds.includes(s.id)}
                    onChange={() => toggleBulkUser(s.id)}
                  />
                  {s.name}
                </label>
              ))}
            </div>
            <button
              type="button"
              onClick={onBulkAssign}
              disabled={savingTemplate || bulkUserIds.length === 0}
              className="border border-primary/30 text-primary px-4 py-2 rounded-xl text-xs font-semibold disabled:opacity-50"
            >
              Apply to selected ({bulkUserIds.length})
            </button>
          </div>
        </GlassPanel>

        <GlassPanel className="p-5 lg:col-span-1">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <CalendarPlus className="w-4 h-4 text-primary" />
            One-off shift override
          </h3>
          <form onSubmit={onAssign} className="space-y-3 text-xs">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Staff member
              </label>
              <select
                {...register('userId', { required: 'Select a staff member' })}
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
              >
                <option value="">Select staff…</option>
                {staff.map((s) => (
                  <option key={s.id} value={s.id}>
                    {s.name}
                  </option>
                ))}
              </select>
              {errors.userId && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.userId.message}</span>
              )}
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Branch
              </label>
              <select
                {...register('branchId', { required: 'Select a branch' })}
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
              >
                <option value="">Select branch…</option>
                {branches.map((b) => (
                  <option key={b.id} value={b.id}>
                    {b.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Date
              </label>
              <input
                type="date"
                {...register('shiftDate', { required: 'Pick a date' })}
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
              />
            </div>
            <div className="grid grid-cols-2 gap-3">
              <input type="time" {...register('startTime', { required: true })} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
              <input type="time" {...register('endTime', { required: true })} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
            </div>
            <input {...register('notes')} placeholder="Notes (optional)" className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:opacity-90 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-70"
            >
              {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <CalendarPlus className="w-3.5 h-3.5" />}
              Assign shift
            </button>
          </form>
        </GlassPanel>
      </div>

      <div className="grid lg:grid-cols-2 gap-6">
        <div>
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
            Upcoming shifts
          </h3>
          <GlassPanel className="p-0 overflow-hidden">
            {shifts.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={tableHeadClass}>
                      <th className="px-5 py-3">Staff</th>
                      <th className="px-5 py-3">Date</th>
                      <th className="px-5 py-3">Time</th>
                      <th className="px-5 py-3 text-right">Action</th>
                    </tr>
                  </thead>
                  <tbody>
                    {shifts.map((s) => (
                      <tr key={s.id} className={tableRowClass}>
                        <td className="px-5 py-3 font-semibold text-on-surface">{s.staffName}</td>
                        <td className="px-5 py-3 text-on-surface-variant">
                          {new Date(s.shiftDate).toLocaleDateString()}
                        </td>
                        <td className="px-5 py-3 text-on-surface-variant">
                          {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                        </td>
                        <td className="px-5 py-3 text-right">
                          <button
                            disabled={isPending}
                            onClick={() => onDelete(s.id)}
                            className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-destructive/30 text-destructive disabled:opacity-60"
                          >
                            {deletingId === s.id ? (
                              <Loader2 className="w-3 h-3 animate-spin" />
                            ) : (
                              <Trash2 className="w-3 h-3" />
                            )}
                          </button>
                        </td>
                      </tr>
                    ))}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant text-center py-10">No upcoming shifts scheduled.</p>
            )}
          </GlassPanel>
        </div>

        <div>
          <div className="flex items-center justify-between mb-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Today roster · {new Date(attendanceDate).toLocaleDateString()}
            </h3>
            <span className="text-[10px] text-on-surface-variant">
              {present}/{attendance.length} on site
            </span>
          </div>
          <GlassPanel className="p-0 overflow-hidden">
            {attendance.length > 0 ? (
              <div className="overflow-x-auto">
                <table className="w-full text-left border-collapse text-xs">
                  <thead>
                    <tr className={tableHeadClass}>
                      <th className="px-5 py-3">Staff</th>
                      <th className="px-5 py-3">Check in</th>
                      <th className="px-5 py-3">Status</th>
                    </tr>
                  </thead>
                  <tbody>
                    {attendance.map((a) => {
                      const Icon = rosterIcon[a.rosterStatus];
                      const styleKey =
                        a.rosterStatus === 'late'
                          ? 'late'
                          : a.rosterStatus === 'absent'
                            ? 'absent'
                            : a.rosterStatus === 'present'
                              ? 'present'
                              : a.rosterStatus;
                      return (
                        <tr key={a.userId} className={tableRowClass}>
                          <td className="px-5 py-3">
                            <span className="font-semibold text-on-surface block">{a.staffName}</span>
                            <span className="text-[10px] text-on-surface-variant capitalize">
                              {a.role.replace('_', ' ')}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant">{fmtTime(a.checkInAt)}</td>
                          <td className="px-5 py-3">
                            <span
                              className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                STATUS_STYLES[styleKey] || STATUS_STYLES.not_scheduled
                              }`}
                            >
                              <Icon className="w-3 h-3" />
                              {ROSTER_LABELS[a.rosterStatus]}
                            </span>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant text-center py-10">No staff to show.</p>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
