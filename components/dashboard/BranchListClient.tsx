'use client';

import { useState } from 'react';
import { toggleBranchStatusAction } from '@/lib/services/branch-actions';
import { MapPin, Phone, Mail, CheckCircle, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Branch {
  id: string;
  name: string;
  address: string | null;
  phone: string | null;
  email: string | null;
  is_active: boolean;
}

interface BranchListClientProps {
  initialBranches: Branch[];
}

export default function BranchListClient({ initialBranches }: BranchListClientProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  const handleToggleActive = async (branchId: string, currentStatus: boolean) => {
    setUpdatingId(branchId);
    try {
      const res = await toggleBranchStatusAction(branchId, !currentStatus);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to update branch status');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  if (initialBranches.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center">
        <MapPin className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <h4 className="text-sm font-bold text-on-surface mb-1">No Branches Found</h4>
        <p className="text-xs text-on-surface-variant/60">Create your initial branch using the button above.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
            <th className="px-6 py-4">Branch Name</th>
            <th className="px-6 py-4">Address</th>
            <th className="px-6 py-4">Contact Info</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30 text-xs">
          {initialBranches.map((branch) => (
            <tr key={branch.id} className="hover:bg-surface-container/10 transition-colors">
              <td className="px-6 py-4 font-bold text-on-surface">
                {branch.name}
              </td>
              <td className="px-6 py-4 text-on-surface-variant/80">
                {branch.address || '—'}
              </td>
              <td className="px-6 py-4 space-y-1">
                {branch.phone && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                    <Phone className="w-3.5 h-3.5 text-primary/60" />
                    <span>{branch.phone}</span>
                  </div>
                )}
                {branch.email && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                    <Mail className="w-3.5 h-3.5 text-primary/60" />
                    <span>{branch.email}</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                {branch.is_active ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <XCircle className="w-3 h-3" />
                    Inactive
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <button
                  disabled={updatingId !== null}
                  onClick={() => handleToggleActive(branch.id, branch.is_active)}
                  className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                    branch.is_active
                      ? 'border-destructive/30 text-destructive hover:bg-destructive/5'
                      : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5'
                  }`}
                >
                  {updatingId === branch.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : branch.is_active ? (
                    'Deactivate'
                  ) : (
                    'Activate'
                  )}
                </button>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

