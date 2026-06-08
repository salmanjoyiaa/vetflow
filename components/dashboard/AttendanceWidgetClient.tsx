'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { checkInAction, checkOutAction } from '@/lib/services/attendance-actions';
import { LogIn, LogOut, Loader2, Clock, CheckCircle2, AlertCircle } from 'lucide-react';

export type MyAttendance = {
  checkedIn: boolean;
  checkedOut: boolean;
  status: string | null;
  checkInAt: string | null;
  checkOutAt: string | null;
};

function fmt(iso: string | null): string {
  if (!iso) return '—';
  return new Date(iso).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
}

export default function AttendanceWidgetClient({ initial }: { initial: MyAttendance }) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const run = (fn: () => Promise<{ success: boolean; error?: string }>) => {
    setError(null);
    startTransition(async () => {
      const res = await fn();
      if (res.success) router.refresh();
      else setError(res.error || 'Action failed.');
    });
  };

  const isLate = initial.status === 'late';

  return (
    <div className="glass-panel rounded-2xl p-5 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
      <div className="flex items-center gap-4">
        <div
          className={`w-11 h-11 rounded-xl flex items-center justify-center ${
            initial.checkedIn ? 'bg-emerald-500/10 text-emerald-500' : 'bg-primary/10 text-primary'
          }`}
        >
          <Clock className="w-5 h-5" />
        </div>
        <div>
          <span className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider block">
            My attendance · today
          </span>
          {initial.checkedIn ? (
            <span className="text-xs font-semibold text-on-surface flex items-center gap-2 flex-wrap">
              <span className="inline-flex items-center gap-1 text-emerald-600">
                <CheckCircle2 className="w-3.5 h-3.5" />
                In {fmt(initial.checkInAt)}
              </span>
              {initial.checkedOut && (
                <span className="inline-flex items-center gap-1 text-on-surface-variant">
                  <LogOut className="w-3.5 h-3.5" />
                  Out {fmt(initial.checkOutAt)}
                </span>
              )}
              {isLate && (
                <span className="inline-flex items-center gap-1 text-amber-600">
                  <AlertCircle className="w-3.5 h-3.5" />
                  Late
                </span>
              )}
            </span>
          ) : (
            <span className="text-xs text-on-surface-variant">You haven&apos;t checked in yet.</span>
          )}
          {error && <span className="text-[10px] text-destructive block mt-1">{error}</span>}
        </div>
      </div>

      <div>
        {!initial.checkedIn ? (
          <button
            disabled={isPending}
            onClick={() => run(checkInAction)}
            className="inline-flex items-center gap-1.5 bg-primary hover:opacity-90 text-white py-2.5 px-5 rounded-xl text-xs font-bold disabled:opacity-70"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogIn className="w-4 h-4" />}
            Check in
          </button>
        ) : !initial.checkedOut ? (
          <button
            disabled={isPending}
            onClick={() => run(checkOutAction)}
            className="inline-flex items-center gap-1.5 border border-outline-variant hover:bg-surface-container text-on-surface py-2.5 px-5 rounded-xl text-xs font-bold disabled:opacity-70"
          >
            {isPending ? <Loader2 className="w-4 h-4 animate-spin" /> : <LogOut className="w-4 h-4" />}
            Check out
          </button>
        ) : (
          <span className="inline-flex items-center gap-1.5 text-xs font-bold text-emerald-600">
            <CheckCircle2 className="w-4 h-4" />
            Shift complete
          </span>
        )}
      </div>
    </div>
  );
}
