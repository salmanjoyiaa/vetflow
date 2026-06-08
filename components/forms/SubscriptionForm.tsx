'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { updateSubscriptionAction } from '@/lib/services/super-admin-actions';
import { SubscriptionSchema, type SubscriptionInput } from '@/lib/validations/schemas';
import { Loader2, Settings, X } from 'lucide-react';

interface SubscriptionFormProps {
  organizationId: string;
  organizationName: string;
  currentPlan: string;
  currentStatus: string;
  currentTrialEnd: string;
  currentRenewalDate?: string;
  currentNotes?: string;
}

export default function SubscriptionForm({
  organizationId,
  organizationName,
  currentPlan,
  currentStatus,
  currentTrialEnd,
  currentRenewalDate = '',
  currentNotes = '',
}: SubscriptionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SubscriptionInput>({
    resolver: zodResolver(SubscriptionSchema),
    defaultValues: {
      organizationId,
      planName: currentPlan as any,
      status: currentStatus as any,
      trialEnd: new Date(currentTrialEnd).toISOString().split('T')[0],
      renewalDate: currentRenewalDate ? new Date(currentRenewalDate).toISOString().split('T')[0] : '',
      notes: currentNotes,
    },
  });

  const onSubmit = async (data: SubscriptionInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await updateSubscriptionAction(data);
      if (res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to update subscription');
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
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-all"
        title="Manage Tenant Subscription"
      >
        <Settings className="w-3.5 h-3.5" />
        Configure Plan
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm text-left">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-on-surface mb-1">Override Subscription Plan</h3>
            <p className="text-xs text-on-surface-variant/60 mb-4 truncate">Clinic: {organizationName}</p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
              
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Plan Tier
                  </label>
                  <select
                    {...register('planName')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface font-bold outline-none"
                  >
                    <option value="trial">Trial</option>
                    <option value="starter">Starter</option>
                    <option value="pro">Pro</option>
                    <option value="enterprise">Enterprise</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Account Status
                  </label>
                  <select
                    {...register('status')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface font-bold outline-none"
                  >
                    <option value="active">Active</option>
                    <option value="trial">Trialing</option>
                    <option value="suspended">Suspended (Locked)</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Trial End Date
                  </label>
                  <input
                    type="date"
                    {...register('trialEnd')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
                    required
                  />
                  {errors.trialEnd && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.trialEnd.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Renewal / Paid End Date
                  </label>
                  <input
                    type="date"
                    {...register('renewalDate')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Platform Notes
                </label>
                <textarea
                  {...register('notes')}
                  placeholder="Record payment details or special trial instructions..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
                />
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
                    'Apply Override'
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

