'use client';

import { useState } from 'react';
import { toggleStaffStatusAction } from '@/lib/services/staff-actions';
import { Shield, Phone, Mail, CheckCircle, XCircle, Loader2, Users } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface StaffMember {
  id: string;
  firstName: string;
  lastName: string;
  email: string;
  phone: string;
  role: string;
  isActive: boolean;
  branches: { id: string; name: string }[];
}

interface StaffListClientProps {
  initialStaff: StaffMember[];
}

export default function StaffListClient({ initialStaff }: StaffListClientProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const router = useRouter();

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    try {
      const res = await toggleStaffStatusAction(userId, !currentStatus);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to update staff member status');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  if (initialStaff.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center">
        <Users className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <h4 className="text-sm font-bold text-on-surface mb-1">No Staff Members Found</h4>
        <p className="text-xs text-on-surface-variant/60">Invite new team members using the button above.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
            <th className="px-6 py-4">Name</th>
            <th className="px-6 py-4">Role</th>
            <th className="px-6 py-4">Assigned Branches</th>
            <th className="px-6 py-4">Contact Info</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30 text-xs">
          {initialStaff.map((staff) => (
            <tr key={staff.id} className="hover:bg-surface-container/10 transition-colors">
              <td className="px-6 py-4 font-bold text-on-surface">
                {staff.firstName} {staff.lastName}
              </td>
              <td className="px-6 py-4 capitalize text-on-surface font-semibold">
                <span className="inline-flex items-center gap-1">
                  <Shield className="w-3.5 h-3.5 text-primary/70" />
                  {staff.role?.replace('_', ' ')}
                </span>
              </td>
              <td className="px-6 py-4">
                <div className="flex flex-wrap gap-1">
                  {staff.branches.map((b) => (
                    <span 
                      key={b.id} 
                      className="bg-surface-container text-on-surface border border-outline-variant/60 text-[9px] font-semibold px-2 py-0.5 rounded-md"
                    >
                      {b.name}
                    </span>
                  ))}
                  {staff.branches.length === 0 && <span className="text-on-surface-variant/40">—</span>}
                </div>
              </td>
              <td className="px-6 py-4 space-y-1">
                {staff.phone && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                    <Phone className="w-3.5 h-3.5 text-primary/60" />
                    <span>{staff.phone}</span>
                  </div>
                )}
                {staff.email && (
                  <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                    <Mail className="w-3.5 h-3.5 text-primary/60" />
                    <span>{staff.email}</span>
                  </div>
                )}
              </td>
              <td className="px-6 py-4">
                {staff.isActive ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <CheckCircle className="w-3 h-3" />
                    Active
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <XCircle className="w-3 h-3" />
                    Suspended
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                {/* Prevent users from deactivating themselves */}
                {staff.role !== 'clinic_admin' ? (
                  <button
                    disabled={updatingId !== null}
                    onClick={() => handleToggleActive(staff.id, staff.isActive)}
                    className={`inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border transition-all ${
                      staff.isActive
                        ? 'border-destructive/30 text-destructive hover:bg-destructive/5'
                        : 'border-emerald-500/30 text-emerald-600 hover:bg-emerald-500/5'
                    }`}
                  >
                    {updatingId === staff.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : staff.isActive ? (
                      'Suspend'
                    ) : (
                      'Activate'
                    )}
                  </button>
                ) : (
                  <span className="text-[10px] text-on-surface-variant/40 italic">System Owner</span>
                )}
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

