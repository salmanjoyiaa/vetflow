'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createStaffMemberAction } from '@/lib/services/staff-actions';
import { StaffSchema, type StaffInput } from '@/lib/validations/schemas';
import { Loader2, Plus, X } from 'lucide-react';
import Select from '@/components/ui/premium/Select';

interface StaffFormProps {
  branches: { id: string; name: string }[];
}

export default function StaffForm({ branches }: StaffFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<StaffInput>({
    resolver: zodResolver(StaffSchema),
    defaultValues: {
      branchIds: [],
    },
  });

  const selectedBranches = watch('branchIds') || [];
  const roleWatch = watch('role');

  const handleBranchCheckboxChange = (branchId: string, checked: boolean) => {
    if (checked) {
      setValue('branchIds', [...selectedBranches, branchId], { shouldValidate: true });
    } else {
      setValue(
        'branchIds',
        selectedBranches.filter((id) => id !== branchId),
        { shouldValidate: true }
      );
    }
  };

  const onSubmit = async (data: StaffInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createStaffMemberAction(data);
      if (res.success) {
        reset();
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to onboard staff member');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Staff Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-lg rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-on-surface mb-1">Onboard Staff Member</h3>
            <p className="text-xs text-on-surface-variant/60 mb-6">Create a secure user account for doctors or receptionists.</p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...register('firstName')}
                    placeholder="e.g. Alexander"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.firstName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.firstName.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...register('lastName')}
                    placeholder="e.g. Fleming"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.lastName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.lastName.message}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="e.g. doctor@vetcare.com"
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                />
                {errors.email && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.email.message}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="e.g. 555-0155"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.phone && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.phone.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.password && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.password.message}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Select Role
                </label>
                <Select
                  value={roleWatch}
                  onChange={(v) => setValue('role', v as StaffInput['role'], { shouldValidate: true })}
                  options={[
                    { value: 'doctor', label: 'Doctor' },
                    { value: 'receptionist', label: 'Receptionist' },
                  ]}
                />
                {errors.role && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.role.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Assign Branch Locations
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-outline-variant p-3 rounded-xl bg-surface-container/10 mt-1">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-xs font-semibold text-on-surface cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBranches.includes(b.id)}
                        onChange={(e) => handleBranchCheckboxChange(b.id, e.target.checked)}
                        className="rounded text-primary focus:ring-primary"
                      />
                      <span>{b.name}</span>
                    </label>
                  ))}
                </div>
                {errors.branchIds && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.branchIds.message}</span>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 border border-outline-variant hover:bg-surface-container/50 py-2.5 rounded-xl text-xs font-semibold text-on-surface transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 bg-primary hover:opacity-90 text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Member'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

