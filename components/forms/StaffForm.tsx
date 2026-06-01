'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { StaffSchema, type StaffInput, createStaffMemberAction } from '@/lib/services/staff-actions';
import { Loader2, Plus, X } from 'lucide-react';

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
        className="bg-primary-teal hover:bg-primary-teal/95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Staff Member
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-navy/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium border border-border/40 p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-graphite/40 hover:text-graphite transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-primary-navy mb-1">Onboard Staff Member</h3>
            <p className="text-xs text-graphite/60 mb-6">Create a secure user account for doctors or receptionists.</p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input
                    type="text"
                    {...register('firstName')}
                    placeholder="e.g. Alexander"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.firstName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.firstName.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input
                    type="text"
                    {...register('lastName')}
                    placeholder="e.g. Fleming"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.lastName && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.lastName.message}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input
                  type="email"
                  {...register('email')}
                  placeholder="e.g. doctor@vetcare.com"
                  className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                />
                {errors.email && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.email.message}</span>
                )}
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="e.g. 555-0155"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.phone && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.phone.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Temporary Password
                  </label>
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="Min 6 characters"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.password && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.password.message}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Select Role
                </label>
                <select
                  {...register('role')}
                  className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy font-semibold"
                >
                  <option value="doctor">Doctor</option>
                  <option value="receptionist">Receptionist</option>
                </select>
                {errors.role && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.role.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Assign Branch Locations
                </label>
                <div className="space-y-2 max-h-32 overflow-y-auto border border-border p-3 rounded-xl bg-primary-ivory/10 mt-1">
                  {branches.map((b) => (
                    <label key={b.id} className="flex items-center gap-2 text-xs font-semibold text-primary-navy cursor-pointer">
                      <input
                        type="checkbox"
                        checked={selectedBranches.includes(b.id)}
                        onChange={(e) => handleBranchCheckboxChange(b.id, e.target.checked)}
                        className="rounded text-primary-teal focus:ring-primary-teal"
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
                  className="w-1/2 border border-border hover:bg-primary-ivory/50 py-2.5 rounded-xl text-xs font-semibold text-primary-navy transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 bg-primary-navy hover:bg-primary-teal text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
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
