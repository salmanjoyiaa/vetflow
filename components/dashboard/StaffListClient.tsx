'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import {
  toggleStaffStatusAction,
  updateStaffMemberAction,
} from '@/lib/services/staff-actions';
import { Shield, Phone, Mail, CheckCircle, XCircle, Loader2, Users, Pencil, X } from 'lucide-react';
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
  branches: { id: string; name: string }[];
}

type EditValues = {
  firstName: string;
  lastName: string;
  phone: string;
  role: 'doctor' | 'receptionist';
  branchIds: string[];
};

export default function StaffListClient({ initialStaff, branches }: StaffListClientProps) {
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [editing, setEditing] = useState<StaffMember | null>(null);
  const [editError, setEditError] = useState<string | null>(null);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors, isSubmitting },
  } = useForm<EditValues>();

  const selectedBranches = watch('branchIds') || [];

  const openEdit = (staff: StaffMember) => {
    setEditError(null);
    setEditing(staff);
    reset({
      firstName: staff.firstName,
      lastName: staff.lastName,
      phone: staff.phone,
      role: (staff.role === 'doctor' ? 'doctor' : 'receptionist') as 'doctor' | 'receptionist',
      branchIds: staff.branches.map((b) => b.id),
    });
  };

  const toggleBranch = (id: string) => {
    const set = new Set(selectedBranches);
    if (set.has(id)) set.delete(id);
    else set.add(id);
    setValue('branchIds', Array.from(set), { shouldValidate: true });
  };

  const onSubmitEdit = handleSubmit(async (data) => {
    if (!editing) return;
    setEditError(null);
    const res = await updateStaffMemberAction({ userId: editing.id, ...data });
    if (res.success) {
      setEditing(null);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to update staff member.');
    }
  });

  const handleToggleActive = async (userId: string, currentStatus: boolean) => {
    setUpdatingId(userId);
    try {
      const res = await toggleStaffStatusAction(userId, !currentStatus);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to update staff member status');
      }
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
      <div className="overflow-x-auto">
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
                  {staff.role !== 'clinic_admin' ? (
                    <div className="inline-flex items-center gap-2">
                      <button
                        onClick={() => openEdit(staff)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold px-2.5 py-1.5 rounded-lg border border-outline-variant text-on-surface hover:bg-surface-container"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit
                      </button>
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
                    </div>
                  ) : (
                    <span className="text-[10px] text-on-surface-variant/40 italic">System Owner</span>
                  )}
                </td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>

      {editing && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative">
            <button
              onClick={() => setEditing(null)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant"
            >
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-on-surface mb-1">
              Edit {editing.firstName} {editing.lastName}
            </h3>
            <p className="text-xs text-on-surface-variant/60 mb-4">{editing.email}</p>

            {editError && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {editError}
              </div>
            )}

            <form onSubmit={onSubmitEdit} className="space-y-4 text-xs">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    First name
                  </label>
                  <input
                    {...register('firstName', { required: 'Required' })}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                  {errors.firstName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.firstName.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Last name
                  </label>
                  <input
                    {...register('lastName', { required: 'Required' })}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                  {errors.lastName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.lastName.message}</span>
                  )}
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Phone
                </label>
                <input
                  {...register('phone', { required: 'Required' })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                />
                {errors.phone && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.phone.message}</span>
                )}
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Role
                </label>
                <select
                  {...register('role', { required: true })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                >
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                </select>
              </div>
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Branches
                </label>
                <div className="flex flex-wrap gap-2">
                  {branches.map((b) => {
                    const active = selectedBranches.includes(b.id);
                    return (
                      <button
                        key={b.id}
                        type="button"
                        onClick={() => toggleBranch(b.id)}
                        className={`text-[10px] font-semibold px-2.5 py-1.5 rounded-lg border transition-all ${
                          active
                            ? 'bg-primary/10 border-primary/30 text-primary'
                            : 'border-outline-variant text-on-surface-variant hover:bg-surface-container'
                        }`}
                      >
                        {b.name}
                      </button>
                    );
                  })}
                </div>
                {errors.branchIds && (
                  <span className="text-[10px] text-destructive mt-1 block">Assign at least one branch.</span>
                )}
                <input type="hidden" {...register('branchIds', { validate: (v) => (v?.length ?? 0) > 0 })} />
              </div>
              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setEditing(null)}
                  className="w-1/2 border border-outline-variant hover:bg-surface-container/50 py-2.5 rounded-xl text-xs font-semibold text-on-surface"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isSubmitting}
                  className="w-1/2 bg-primary hover:opacity-90 text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-70"
                >
                  {isSubmitting ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : null}
                  Save changes
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </div>
  );
}
