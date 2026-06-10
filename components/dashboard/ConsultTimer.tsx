'use client';

import { useEffect, useState } from 'react';
import { Clock } from 'lucide-react';

interface ConsultTimerProps {
  startedAt: string;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.floor(ms / 1000);
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export default function ConsultTimer({ startedAt }: ConsultTimerProps) {
  const [elapsed, setElapsed] = useState('0:00');

  useEffect(() => {
    const start = new Date(startedAt).getTime();
    const tick = () => setElapsed(formatElapsed(Date.now() - start));
    tick();
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt]);

  return (
    <span className="inline-flex items-center gap-1 text-[10px] font-bold text-blue-400 bg-blue-500/10 border border-blue-500/20 px-2 py-0.5 rounded-full">
      <Clock className="w-3 h-3" />
      {elapsed}
    </span>
  );
}
