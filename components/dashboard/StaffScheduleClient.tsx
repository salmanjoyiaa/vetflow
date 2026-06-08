'use client';

import { useState, useTransition } from 'react';
import { useForm } from 'react-hook-form';
import { useRouter } from 'next/navigation';
import { assignShiftAction, deleteShiftAction } from '@/lib/services/attendance-actions';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import { tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import { CalendarPlus, Loader2, Trash2, Clock, CheckCircle, XCircle, AlertCircle } from 'lucide-react';

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
  checkInAt: string | null;
  checkOutAt: string | null;
};

type FormValues = {
  userId: string;
  branchId: string;
  shiftDate: string;
  startTime: string;
  endTime: string;
  notes: string;
};

const STATUS_STYLES: Record<string, string> = {
  present: 'bg-emerald-500/10 text-emerald-600',
  late: 'bg-amber-500/10 text-amber-600',
  absent: 'bg-destructive/10 text-destructive',
  on_leave: 'bg-surface-container text-on-surface-variant',
};

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
}: {
  staff: StaffOption[];
  branches: BranchOption[];
  shifts: ShiftRow[];
  attendance: AttendanceRow[];
  attendanceDate: string;
}) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors, isSubmitting },
  } = useForm<FormValues>({
    defaultValues: { startTime: '09:00', endTime: '17:00' },
  });

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

  const present = attendance.filter((a) => a.checkInAt).length;

  return (
    <div className="space-y-8">
      <div className="grid lg:grid-cols-3 gap-6">
        <GlassPanel className="p-5 lg:col-span-1">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4 flex items-center gap-1.5">
            <CalendarPlus className="w-4 h-4 text-primary" />
            Assign a shift
          </h3>
          {error && (
            <div className="mb-3 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}
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
              {errors.branchId && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.branchId.message}</span>
              )}
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
              {errors.shiftDate && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.shiftDate.message}</span>
              )}
            </div>
            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Start
                </label>
                <input
                  type="time"
                  {...register('startTime', { required: true })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                />
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  End
                </label>
                <input
                  type="time"
                  {...register('endTime', { required: true })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                />
              </div>
            </div>
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Notes (optional)
              </label>
              <input
                {...register('notes')}
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
              />
            </div>
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

        <div className="lg:col-span-2 space-y-6">
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
                        <th className="px-5 py-3">Branch</th>
                        <th className="px-5 py-3">Date</th>
                        <th className="px-5 py-3">Time</th>
                        <th className="px-5 py-3 text-right">Action</th>
                      </tr>
                    </thead>
                    <tbody>
                      {shifts.map((s) => (
                        <tr key={s.id} className={tableRowClass}>
                          <td className="px-5 py-3 font-semibold text-on-surface">{s.staffName}</td>
                          <td className="px-5 py-3 text-on-surface-variant">{s.branchName}</td>
                          <td className="px-5 py-3 text-on-surface-variant">
                            {new Date(s.shiftDate).toLocaleDateString()}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant">
                            <span className="inline-flex items-center gap-1">
                              <Clock className="w-3 h-3" />
                              {s.startTime.slice(0, 5)}–{s.endTime.slice(0, 5)}
                            </span>
                          </td>
                          <td className="px-5 py-3 text-right">
                            <button
                              disabled={isPending}
                              onClick={() => onDelete(s.id)}
                              className="inline-flex items-center gap-1 text-[10px] font-bold px-2 py-1 rounded-lg border border-destructive/30 text-destructive hover:bg-destructive/10 disabled:opacity-60"
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
                Attendance · {new Date(attendanceDate).toLocaleDateString()}
              </h3>
              <span className="text-[10px] text-on-surface-variant">
                {present}/{attendance.length} checked in
              </span>
            </div>
            <GlassPanel className="p-0 overflow-hidden">
              {attendance.length > 0 ? (
                <div className="overflow-x-auto">
                  <table className="w-full text-left border-collapse text-xs">
                    <thead>
                      <tr className={tableHeadClass}>
                        <th className="px-5 py-3">Staff</th>
                        <th className="px-5 py-3">Role</th>
                        <th className="px-5 py-3">Check in</th>
                        <th className="px-5 py-3">Check out</th>
                        <th className="px-5 py-3">Status</th>
                      </tr>
                    </thead>
                    <tbody>
                      {attendance.map((a) => (
                        <tr key={a.userId} className={tableRowClass}>
                          <td className="px-5 py-3 font-semibold text-on-surface">{a.staffName}</td>
                          <td className="px-5 py-3 capitalize text-on-surface-variant">
                            {a.role.replace('_', ' ')}
                          </td>
                          <td className="px-5 py-3 text-on-surface-variant">{fmtTime(a.checkInAt)}</td>
                          <td className="px-5 py-3 text-on-surface-variant">{fmtTime(a.checkOutAt)}</td>
                          <td className="px-5 py-3">
                            {a.checkInAt ? (
                              <span
                                className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold ${
                                  STATUS_STYLES[a.status || 'present'] || STATUS_STYLES.present
                                }`}
                              >
                                {a.status === 'late' ? (
                                  <AlertCircle className="w-3 h-3" />
                                ) : (
                                  <CheckCircle className="w-3 h-3" />
                                )}
                                {a.status || 'present'}
                              </span>
                            ) : (
                              <span className="inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold bg-surface-container text-on-surface-variant">
                                <XCircle className="w-3 h-3" />
                                Not in
                              </span>
                            )}
                          </td>
                        </tr>
                      ))}
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
    </div>
  );
}
