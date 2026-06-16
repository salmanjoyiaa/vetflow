'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import DateRangeQuickFilter from '@/components/dashboard/DateRangeQuickFilter';
import NewAppointmentWizard from '@/components/reception/NewAppointmentWizard';
import {
  ChevronLeft,
  ChevronRight,
  Plus,
} from 'lucide-react';
import {
  addDaysToDate,
  formatDateYmd,
  formatDisplayDate,
  parseDateYmd,
  startOfToday,
} from '@/lib/utils/date-filters';

const START_HOUR = 7;
const END_HOUR = 19;
const SLOT_MINUTES = 15;
const ROW_HEIGHT = 28;

export interface ScheduleDoctor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface ScheduleAppointment {
  id: string;
  patientName: string;
  customerName: string;
  reason: string;
  status: string;
  preferredDate: string;
  preferredTime: string;
  durationMinutes: number;
  doctorId: string | null;
  isEmergency: boolean;
}

interface ScheduleDayCalendarClientProps {
  doctors: ScheduleDoctor[];
  appointments: ScheduleAppointment[];
  selectedDate: string;
  currentUserId: string;
  currentRole: string | null;
  activeBranchId: string;
}

const STATUS_COLORS: Record<string, string> = {
  confirmed: 'bg-blue-500/20 border-blue-500/40 text-blue-200',
  requested: 'bg-amber-500/20 border-amber-500/40 text-amber-200',
  checked_in: 'bg-emerald-500/20 border-emerald-500/40 text-emerald-200',
  rescheduled: 'bg-violet-500/20 border-violet-500/40 text-violet-200',
};

function timeToMinutes(time: string): number {
  const [h, m] = time.split(':').map(Number);
  return (h || 0) * 60 + (m || 0);
}

function minutesToLabel(minutes: number): string {
  const h = Math.floor(minutes / 60);
  const m = minutes % 60;
  const ampm = h >= 12 ? 'PM' : 'AM';
  const hr = h % 12 || 12;
  return `${hr}:${m.toString().padStart(2, '0')} ${ampm}`;
}

export default function ScheduleDayCalendarClient({
  doctors,
  appointments,
  selectedDate,
  currentUserId,
  currentRole,
  activeBranchId,
}: ScheduleDayCalendarClientProps) {
  const router = useRouter();
  const [doctorFilter, setDoctorFilter] = useState<string>(
    currentRole === 'doctor' ? currentUserId : 'all'
  );
  const [wizardOpen, setWizardOpen] = useState(false);
  const [wizardPrefill, setWizardPrefill] = useState<{
    date?: string;
    time?: string;
    doctorId?: string;
  }>({});

  const slots = useMemo(() => {
    const list: number[] = [];
    for (let m = START_HOUR * 60; m < END_HOUR * 60; m += SLOT_MINUTES) {
      list.push(m);
    }
    return list;
  }, []);

  const columns = useMemo(() => {
    const cols: { id: string; label: string }[] = [];
    if (doctorFilter === 'all') {
      cols.push({ id: 'unassigned', label: 'Unassigned' });
      for (const d of doctors) {
        cols.push({ id: d.id, label: `Dr. ${d.firstName} ${d.lastName}` });
      }
    } else {
      const d = doctors.find((x) => x.id === doctorFilter);
      cols.push({
        id: doctorFilter,
        label: d ? `Dr. ${d.firstName} ${d.lastName}` : 'Doctor',
      });
    }
    return cols;
  }, [doctors, doctorFilter]);

  const dayAppointments = useMemo(
    () => appointments.filter((a) => a.preferredDate === selectedDate),
    [appointments, selectedDate]
  );

  const navigateDate = (delta: number) => {
    const base = parseDateYmd(selectedDate) ?? startOfToday();
    const next = formatDateYmd(addDaysToDate(base, delta));
    router.push(`/dashboard/schedule?date=${next}`);
  };

  const openSlot = (minutes: number, doctorId: string | null) => {
    const h = Math.floor(minutes / 60);
    const m = minutes % 60;
    setWizardPrefill({
      date: selectedDate,
      time: `${String(h).padStart(2, '0')}:${String(m).padStart(2, '0')}:00`,
      doctorId: doctorId || undefined,
    });
    setWizardOpen(true);
  };

  const gridHeight = slots.length * ROW_HEIGHT;

  return (
    <div className="space-y-6">
      <div className="flex flex-col lg:flex-row lg:items-center justify-between gap-4">
        <div className="flex items-center gap-2">
          <button
            type="button"
            onClick={() => navigateDate(-1)}
            className="p-2 rounded-lg border border-outline-variant/50 hover:bg-surface-container-high"
          >
            <ChevronLeft className="w-4 h-4" />
          </button>
          <div className="text-center min-w-[180px]">
            <p className="text-sm font-black text-on-surface">{formatDisplayDate(selectedDate)}</p>
            <p className="text-[10px] text-on-surface-variant">
              {dayAppointments.length} appointment{dayAppointments.length !== 1 ? 's' : ''}
            </p>
          </div>
          <button
            type="button"
            onClick={() => navigateDate(1)}
            className="p-2 rounded-lg border border-outline-variant/50 hover:bg-surface-container-high"
          >
            <ChevronRight className="w-4 h-4" />
          </button>
        </div>

        <DateRangeQuickFilter showWeek={false} />

        <div className="flex items-center gap-2 flex-wrap">
          {currentRole !== 'doctor' && (
            <select
              value={doctorFilter}
              onChange={(e) => setDoctorFilter(e.target.value)}
              className="px-3 py-2 rounded-xl text-xs font-bold bg-surface-container/30 border border-outline-variant/50"
            >
              <option value="all">All providers</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          )}
          <button
            type="button"
            onClick={() => {
              setWizardPrefill({ date: selectedDate });
              setWizardOpen(true);
            }}
            className="inline-flex items-center gap-1.5 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold"
          >
            <Plus className="w-3.5 h-3.5" />
            New appointment
          </button>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
        <div className="overflow-x-auto">
          <div
            className="grid min-w-[720px]"
            style={{
              gridTemplateColumns: `64px repeat(${columns.length}, minmax(140px, 1fr))`,
            }}
          >
            <div className="bg-surface-container/40 border-b border-r border-outline-variant/30" />
            {columns.map((col) => (
              <div
                key={col.id}
                className="px-3 py-3 border-b border-r border-outline-variant/30 bg-surface-container/30 text-[10px] font-bold text-on-surface uppercase tracking-wider"
              >
                {col.label}
                <span className="block text-[9px] font-semibold text-primary normal-case mt-0.5">
                  {
                    dayAppointments.filter((a) =>
                      col.id === 'unassigned' ? !a.doctorId : a.doctorId === col.id
                    ).length
                  }{' '}
                  appts
                </span>
              </div>
            ))}

            <div className="relative border-r border-outline-variant/20" style={{ height: gridHeight }}>
              {slots.map((m, i) => (
                <div
                  key={m}
                  className="absolute left-0 right-0 text-[9px] text-on-surface-variant/60 pr-2 text-right border-t border-outline-variant/15"
                  style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT, lineHeight: `${ROW_HEIGHT}px` }}
                >
                  {m % 60 === 0 ? minutesToLabel(m) : ''}
                </div>
              ))}
            </div>

            {columns.map((col) => {
              const colAppts = dayAppointments.filter((a) =>
                col.id === 'unassigned' ? !a.doctorId : a.doctorId === col.id
              );
              return (
                <div
                  key={col.id}
                  className="relative border-r border-outline-variant/20 bg-surface/30"
                  style={{ height: gridHeight }}
                >
                  {slots.map((m, i) => (
                    <button
                      key={m}
                      type="button"
                      className="absolute left-0 right-0 border-t border-outline-variant/10 hover:bg-primary/5 transition-colors"
                      style={{ top: i * ROW_HEIGHT, height: ROW_HEIGHT }}
                      onClick={() =>
                        openSlot(m, col.id === 'unassigned' ? null : col.id)
                      }
                      aria-label={`Book slot ${minutesToLabel(m)}`}
                    />
                  ))}
                  {colAppts.map((appt) => {
                    const start = timeToMinutes(appt.preferredTime.slice(0, 5));
                    const startOffset = start - START_HOUR * 60;
                    if (startOffset < 0 || startOffset >= (END_HOUR - START_HOUR) * 60) return null;
                    const top = (startOffset / SLOT_MINUTES) * ROW_HEIGHT;
                    const height = Math.max(
                      ROW_HEIGHT,
                      (appt.durationMinutes / SLOT_MINUTES) * ROW_HEIGHT - 2
                    );
                    const color =
                      STATUS_COLORS[appt.status] ??
                      'bg-surface-container-high border-outline-variant/40 text-on-surface';
                    return (
                      <Link
                        key={appt.id}
                        href="/dashboard/appointments"
                        className={`absolute left-1 right-1 rounded-lg border px-2 py-1 overflow-hidden text-left shadow-sm ${color}`}
                        style={{ top: top + 1, height, zIndex: 10 }}
                      >
                        <p className="text-[10px] font-bold truncate">{appt.patientName}</p>
                        <p className="text-[9px] opacity-80 truncate">{appt.reason}</p>
                        {appt.isEmergency && (
                          <span className="text-[8px] font-black text-destructive">ER</span>
                        )}
                      </Link>
                    );
                  })}
                </div>
              );
            })}
          </div>
        </div>
      </div>

      <NewAppointmentWizard
        doctors={doctors}
        activeBranchId={activeBranchId}
        isOpen={wizardOpen}
        onClose={() => setWizardOpen(false)}
        initialPreferredDate={wizardPrefill.date}
        initialPreferredTime={wizardPrefill.time}
        initialDoctorId={wizardPrefill.doctorId}
      />
    </div>
  );
}
