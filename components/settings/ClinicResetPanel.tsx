'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { resetClinicDataAction } from '@/lib/services/clinic-reset-actions';
import { AlertTriangle, Loader2 } from 'lucide-react';

interface ClinicResetPanelProps {
  organizationName: string;
}

export default function ClinicResetPanel({ organizationName }: ClinicResetPanelProps) {
  const router = useRouter();
  const [acknowledged, setAcknowledged] = useState(false);
  const [phrase, setPhrase] = useState('');
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

  const expectedPhrase = `RESET ${organizationName}`;

  const handleReset = async () => {
    if (!acknowledged) {
      setError('Confirm that you understand this action is permanent.');
      return;
    }
    setIsLoading(true);
    setError(null);
    const res = await resetClinicDataAction({ confirmationPhrase: phrase.trim() });
    setIsLoading(false);
    if (res.success) {
      router.push('/dashboard');
      router.refresh();
    } else {
      setError(res.error || 'Reset failed');
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-destructive/30 p-6 shadow-premium space-y-4">
      <div className="flex items-start gap-3">
        <AlertTriangle className="w-5 h-5 text-destructive shrink-0 mt-0.5" />
        <div>
          <h3 className="text-sm font-bold text-on-surface">Danger zone — reset clinic data</h3>
          <p className="text-xs text-on-surface-variant mt-1">
            Permanently removes all customers, pets, visits, prescriptions, invoices, inventory,
            appointments, documents, branches, and staff accounts except yours. Subscription,
            settings, and tax configuration are kept. You must re-invite staff afterward.
          </p>
        </div>
      </div>

      <label className="flex items-center gap-2 text-xs text-on-surface cursor-pointer">
        <input
          type="checkbox"
          checked={acknowledged}
          onChange={(e) => setAcknowledged(e.target.checked)}
          className="rounded border-outline-variant/60"
        />
        I understand this cannot be undone
      </label>

      <div>
        <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
          Type <span className="font-mono text-destructive">{expectedPhrase}</span> to confirm
        </label>
        <input
          type="text"
          value={phrase}
          onChange={(e) => setPhrase(e.target.value)}
          placeholder={expectedPhrase}
          className="w-full px-4 py-2.5 bg-surface-container/30 border border-destructive/30 rounded-xl text-sm text-on-surface outline-none focus:border-destructive"
        />
      </div>

      {error && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}

      <button
        type="button"
        onClick={handleReset}
        disabled={isLoading || !acknowledged || phrase.trim() !== expectedPhrase}
        className="inline-flex items-center gap-2 bg-destructive text-white px-4 py-2.5 rounded-xl text-xs font-bold disabled:opacity-50"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Resetting clinic…
          </>
        ) : (
          'Reset all clinic data'
        )}
      </button>
    </div>
  );
}
