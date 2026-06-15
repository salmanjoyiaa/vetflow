'use client';

import { Clock } from 'lucide-react';

interface StaffDashboardGateProps {
  /** When true, only the gate message is shown (attendance widget renders outside). */
  locked: boolean;
  children: React.ReactNode;
}

export default function StaffDashboardGate({ locked, children }: StaffDashboardGateProps) {
  if (locked) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-8 text-center shadow-premium">
        <div className="w-12 h-12 rounded-xl bg-primary/10 text-primary flex items-center justify-center mx-auto mb-4">
          <Clock className="w-6 h-6" />
        </div>
        <h3 className="text-sm font-bold text-on-surface mb-1">Check in to open your workspace</h3>
        <p className="text-xs text-on-surface-variant max-w-sm mx-auto">
          Use the attendance card above to check in for today. Your quick actions, queue, and clinic
          tools will appear here once you are on site.
        </p>
      </div>
    );
  }

  return <>{children}</>;
}
