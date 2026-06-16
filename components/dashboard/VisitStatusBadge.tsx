'use client';

import {
  getVisitDisplayStatus,
  VISIT_STATUS_BADGE_CLASS,
  VISIT_STATUS_LABELS,
  type VisitPauseInfo,
} from '@/lib/utils/visit-status';
import { Pause } from 'lucide-react';

interface VisitStatusBadgeProps {
  status: string;
  pause?: VisitPauseInfo;
  showPauseReason?: boolean;
  className?: string;
}

export default function VisitStatusBadge({
  status,
  pause = {},
  showPauseReason = false,
  className = '',
}: VisitStatusBadgeProps) {
  const display = getVisitDisplayStatus(status, pause);
  const label = VISIT_STATUS_LABELS[display] ?? display.replace(/_/g, ' ');
  const badgeClass = VISIT_STATUS_BADGE_CLASS[display] ?? VISIT_STATUS_BADGE_CLASS.waiting;
  const reason = pause.consultPauseReason?.trim();

  return (
    <span className={`inline-flex flex-col items-start gap-0.5 ${className}`}>
      <span
        className={`inline-flex items-center gap-1 px-2 py-0.5 rounded-full text-[10px] font-bold border ${badgeClass}`}
      >
        {display === 'consult_paused' && <Pause className="w-3 h-3" />}
        {label}
      </span>
      {showPauseReason && display === 'consult_paused' && reason && (
        <span className="text-[10px] text-violet-300/90 max-w-[220px] leading-snug" title={reason}>
          {reason}
        </span>
      )}
    </span>
  );
}
