'use client';

import { useEffect, useState } from 'react';
import { Clock, Pause } from 'lucide-react';

interface ConsultTimerProps {
  startedAt: string;
  pausedAt?: string | null;
  accumulatedPauseSec?: number;
}

function formatElapsed(ms: number): string {
  const totalSec = Math.max(0, Math.floor(ms / 1000));
  const min = Math.floor(totalSec / 60);
  const sec = totalSec % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

function computeElapsedMs(
  startedAt: string,
  pausedAt: string | null | undefined,
  accumulatedPauseSec: number
): number {
  const start = new Date(startedAt).getTime();
  const pauseAccumulatedMs = accumulatedPauseSec * 1000;
  if (pausedAt) {
    const pausedMs = new Date(pausedAt).getTime() - start - pauseAccumulatedMs;
    return Math.max(0, pausedMs);
  }
  return Math.max(0, Date.now() - start - pauseAccumulatedMs);
}

export default function ConsultTimer({
  startedAt,
  pausedAt = null,
  accumulatedPauseSec = 0,
}: ConsultTimerProps) {
  const [elapsed, setElapsed] = useState('0:00');
  const isPaused = Boolean(pausedAt);

  useEffect(() => {
    const tick = () => {
      setElapsed(formatElapsed(computeElapsedMs(startedAt, pausedAt, accumulatedPauseSec)));
    };
    tick();
    if (isPaused) return;
    const id = setInterval(tick, 1000);
    return () => clearInterval(id);
  }, [startedAt, pausedAt, accumulatedPauseSec, isPaused]);

  return (
    <span
      className={`inline-flex items-center gap-1 text-[10px] font-bold px-2 py-0.5 rounded-full border ${
        isPaused
          ? 'text-violet-400 bg-violet-500/10 border-violet-500/25'
          : 'text-blue-400 bg-blue-500/10 border-blue-500/20'
      }`}
    >
      {isPaused ? <Pause className="w-3 h-3" /> : <Clock className="w-3 h-3" />}
      {elapsed}
    </span>
  );
}
