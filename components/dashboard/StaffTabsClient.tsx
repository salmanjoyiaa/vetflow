'use client';

import { useState } from 'react';
import { Users, CalendarClock } from 'lucide-react';

export default function StaffTabsClient({
  team,
  schedule,
}: {
  team: React.ReactNode;
  schedule: React.ReactNode;
}) {
  const [tab, setTab] = useState<'team' | 'schedule'>('team');

  const tabClass = (active: boolean) =>
    `inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-all ${
      active
        ? 'bg-primary/15 text-primary border border-primary/30'
        : 'text-on-surface-variant hover:bg-surface-container border border-transparent'
    }`;

  return (
    <div className="space-y-6">
      <div className="flex gap-2">
        <button className={tabClass(tab === 'team')} onClick={() => setTab('team')}>
          <Users className="w-4 h-4" />
          Team
        </button>
        <button className={tabClass(tab === 'schedule')} onClick={() => setTab('schedule')}>
          <CalendarClock className="w-4 h-4" />
          Schedule & attendance
        </button>
      </div>
      <div className={tab === 'team' ? 'block' : 'hidden'}>{team}</div>
      <div className={tab === 'schedule' ? 'block' : 'hidden'}>{schedule}</div>
    </div>
  );
}
