export type VisitPauseInfo = {
  consultPausedAt?: string | null;
  consultPauseReason?: string | null;
  consultPauseAccumulatedSec?: number;
};

export function isConsultPaused(visit: VisitPauseInfo): boolean {
  return Boolean(visit.consultPausedAt);
}

export function getVisitDisplayStatus(
  status: string,
  pause: VisitPauseInfo
): 'waiting' | 'consulting' | 'consult_paused' | 'ready_for_checkout' | 'completed' | 'cancelled' | string {
  if (status === 'consulting' && isConsultPaused(pause)) {
    return 'consult_paused';
  }
  return status;
}

export const VISIT_STATUS_LABELS: Record<string, string> = {
  waiting: 'Waiting',
  consulting: 'In consult',
  consult_paused: 'Paused',
  ready_for_checkout: 'Ready for checkout',
  completed: 'Completed',
  cancelled: 'Cancelled',
};

export const VISIT_STATUS_BADGE_CLASS: Record<string, string> = {
  waiting: 'bg-amber-500/10 text-amber-600 border-amber-500/20',
  consulting: 'bg-blue-500/10 text-blue-500 border-blue-500/20',
  consult_paused: 'bg-violet-500/10 text-violet-400 border-violet-500/25',
  ready_for_checkout: 'bg-emerald-500/10 text-emerald-600 border-emerald-500/20',
  completed: 'bg-surface-container text-on-surface-variant border-outline-variant/30',
  cancelled: 'bg-destructive/10 text-destructive border-destructive/20',
};
