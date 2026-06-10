'use client';

import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';
import { FileText, FlaskConical, Pill, Stethoscope, Upload } from 'lucide-react';

export type MedicalActivityRow = {
  id: string;
  action: string;
  actorName: string;
  actorRole: string;
  resourceType: string;
  createdAt: string;
  summary: string;
};

interface MedicalRecordActivityPanelProps {
  activities: MedicalActivityRow[];
}

function actionIcon(action: string) {
  if (action.includes('PRESCRIPTION')) return Pill;
  if (action.includes('LAB')) return FlaskConical;
  if (action.includes('DOCUMENT')) return Upload;
  if (action.includes('CLINICAL')) return Stethoscope;
  return FileText;
}

function formatAction(action: string) {
  return action.replace(/_/g, ' ').toLowerCase().replace(/\b\w/g, (c) => c.toUpperCase());
}

export default function MedicalRecordActivityPanel({ activities }: MedicalRecordActivityPanelProps) {
  useVisibilityPolling(20000, true);

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
      <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2">
          <FileText className="w-4 h-4 text-primary" />
          Recent Medical Record Updates
        </h3>
      </div>

      {activities.length === 0 ? (
        <div className="p-8 text-center text-xs text-on-surface-variant/50 italic">
          No recent medical record changes for this branch.
        </div>
      ) : (
        <div className="divide-y divide-outline-variant/20 max-h-80 overflow-y-auto">
          {activities.map((a) => {
            const Icon = actionIcon(a.action);
            return (
              <div key={a.id} className="px-5 py-3 flex items-start gap-3 hover:bg-surface-container/20">
                <div className="w-8 h-8 rounded-lg bg-primary/10 flex items-center justify-center shrink-0 mt-0.5">
                  <Icon className="w-4 h-4 text-primary" />
                </div>
                <div className="min-w-0 flex-1">
                  <p className="text-xs font-bold text-on-surface">{formatAction(a.action)}</p>
                  <p className="text-[10px] text-on-surface-variant truncate">{a.summary}</p>
                  <p className="text-[10px] text-on-surface-variant/60 mt-0.5">
                    {a.actorName} ({a.actorRole}) · {new Date(a.createdAt).toLocaleString()}
                  </p>
                </div>
              </div>
            );
          })}
        </div>
      )}
    </div>
  );
}
