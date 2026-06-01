'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { BranchSchema, type BranchInput, createBranchAction } from '@/lib/services/branch-actions';
import { Loader2, Plus, X } from 'lucide-react';

interface BranchFormProps {
  onSuccess?: () => void;
}

export default function BranchForm({ onSuccess }: BranchFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<BranchInput>({
    resolver: zodResolver(BranchSchema),
  });

  const onSubmit = async (data: BranchInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createBranchAction(data);
      if (res.success) {
        reset();
        setIsOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to create branch');
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
        Add Branch
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-navy/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-md rounded-2xl shadow-premium border border-border/40 p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-graphite/40 hover:text-graphite transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-primary-navy mb-1">Create New Branch</h3>
            <p className="text-xs text-graphite/60 mb-6">Specify operational and contact details for the new site.</p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Branch Name
                </label>
                <input
                  type="text"
                  {...register('name')}
                  placeholder="e.g. Uptown Branch"
                  className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                />
                {errors.name && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.name.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Branch Address
                </label>
                <input
                  type="text"
                  {...register('address')}
                  placeholder="e.g. 789 Broad St"
                  className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                />
                {errors.address && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.address.message}</span>
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
                    placeholder="e.g. 555-0199"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.phone && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.phone.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="e.g. branch@vetcare.com"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.email && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.email.message}</span>
                  )}
                </div>
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
                    'Create Branch'
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
