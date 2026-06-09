'use client';

import { useEffect, useMemo, useState } from 'react';
import { useForm, useWatch } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { updateSubscriptionAction } from '@/lib/services/super-admin-actions';
import { SubscriptionSchema, type SubscriptionInput } from '@/lib/validations/schemas';
import { FEATURE_LABELS, type Feature } from '@/lib/auth/features';
import Select from '@/components/ui/premium/Select';
import { CheckCircle2, CreditCard, Loader2, X } from 'lucide-react';

export type PlanOption = {
  id: string;
  name: string;
  price: number;
  default_features: Record<string, boolean>;
};

interface SubscriptionFormProps {
  organizationId: string;
  organizationName: string;
  currentPlan: string;
  currentStatus: string;
  currentTrialEnd: string;
  currentRenewalDate?: string;
  currentNotes?: string;
  plans: PlanOption[];
}

const STATUS_OPTIONS = [
  { value: 'active', label: 'Active (paid)' },
  { value: 'trial', label: 'Trialing' },
  { value: 'suspended', label: 'Suspended' },
  { value: 'cancelled', label: 'Cancelled' },
];

function formatPlanLabel(plan: PlanOption): string {
  return plan.price > 0 ? `${plan.name} — $${plan.price}/mo` : plan.name;
}

export default function SubscriptionForm({
  organizationId,
  organizationName,
  currentPlan,
  currentStatus,
  currentTrialEnd,
  currentRenewalDate = '',
  currentNotes = '',
  plans,
}: SubscriptionFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const planOptions = useMemo(
    () => plans.map((p) => ({ value: p.id, label: formatPlanLabel(p) })),
    [plans]
  );

  const {
    register,
    handleSubmit,
    setValue,
    control,
    reset,
    formState: { errors },
  } = useForm<SubscriptionInput>({
    resolver: zodResolver(SubscriptionSchema),
    defaultValues: {
      organizationId,
      planName: currentPlan || plans[0]?.id || 'trial',
      status: (currentStatus as SubscriptionInput['status']) || 'trial',
      trialEnd: new Date(currentTrialEnd).toISOString().split('T')[0],
      renewalDate: currentRenewalDate
        ? new Date(currentRenewalDate).toISOString().split('T')[0]
        : '',
      notes: currentNotes,
    },
  });

  const watchedPlan = useWatch({ control, name: 'planName' });
  const watchedStatus = useWatch({ control, name: 'status' });

  const selectedPlan = useMemo(
    () => plans.find((p) => p.id === watchedPlan) ?? null,
    [plans, watchedPlan]
  );

  useEffect(() => {
    if (!isOpen) return;
    reset({
      organizationId,
      planName: currentPlan || plans[0]?.id || 'trial',
      status: (currentStatus as SubscriptionInput['status']) || 'trial',
      trialEnd: new Date(currentTrialEnd).toISOString().split('T')[0],
      renewalDate: currentRenewalDate
        ? new Date(currentRenewalDate).toISOString().split('T')[0]
        : '',
      notes: currentNotes,
    });
    setError(null);
    setSuccess(false);
  }, [
    isOpen,
    organizationId,
    currentPlan,
    currentStatus,
    currentTrialEnd,
    currentRenewalDate,
    currentNotes,
    plans,
    reset,
  ]);

  const onSubmit = async (data: SubscriptionInput) => {
    const planLabel = plans.find((p) => p.id === data.planName)?.name ?? data.planName;
    const statusLabel = STATUS_OPTIONS.find((s) => s.value === data.status)?.label ?? data.status;
    if (
      !window.confirm(
        `Change "${organizationName}" to ${planLabel} (${statusLabel})? This updates billing access immediately.`
      )
    ) {
      return;
    }

    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateSubscriptionAction(data);
      if (res.success) {
        setSuccess(true);
        router.refresh();
        setTimeout(() => {
          setIsOpen(false);
          setSuccess(false);
        }, 1200);
      } else {
        setError(res.error || 'Failed to update subscription');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const showTrialEnd = watchedStatus === 'trial';
  const showRenewal = watchedStatus === 'active';

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1.5 text-[10px] font-bold text-primary border border-primary/30 px-2.5 py-1.5 rounded-lg hover:bg-primary/10 transition-all"
        title="Change clinic plan"
      >
        <CreditCard className="w-3.5 h-3.5" />
        Change plan
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex justify-end bg-black/50 backdrop-blur-sm">
          <div
            className="glass-panel w-full max-w-md h-full overflow-y-auto border-l border-outline-variant/40 p-6 relative shadow-premium text-left"
            role="dialog"
            aria-labelledby="change-plan-title"
          >
            <button
              type="button"
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
              aria-label="Close"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 id="change-plan-title" className="text-base font-bold text-on-surface mb-1 pr-8">
              Change clinic plan
            </h3>
            <p className="text-xs text-on-surface-variant/60 mb-4">{organizationName}</p>

            <div className="mb-4 p-3 rounded-xl bg-surface-container/40 border border-outline-variant/30 text-xs">
              <span className="text-on-surface-variant">Current: </span>
              <span className="font-bold text-on-surface capitalize">{currentPlan}</span>
              <span className="text-on-surface-variant"> · </span>
              <span className="font-semibold capitalize">{currentStatus}</span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}
            {success && (
              <div className="mb-4 p-3 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircle2 className="w-4 h-4 shrink-0" />
                Plan updated successfully.
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4 text-xs">
              <input type="hidden" {...register('organizationId')} />

              <Select
                label="Plan"
                value={watchedPlan}
                onChange={(v) => setValue('planName', v, { shouldValidate: true })}
                options={planOptions}
              />

              {selectedPlan && (
                <div className="p-3 rounded-xl bg-primary/5 border border-primary/20 space-y-1">
                  <p className="text-[10px] font-bold text-primary uppercase tracking-wider">
                    Included features
                  </p>
                  <ul className="text-[10px] text-on-surface-variant space-y-0.5">
                    {Object.entries(selectedPlan.default_features)
                      .filter(([, enabled]) => enabled)
                      .map(([key]) => (
                        <li key={key}>
                          • {FEATURE_LABELS[key as Feature] ?? key}
                        </li>
                      ))}
                  </ul>
                </div>
              )}

              <Select
                label="Account status"
                value={watchedStatus}
                onChange={(v) =>
                  setValue('status', v as SubscriptionInput['status'], { shouldValidate: true })
                }
                options={STATUS_OPTIONS}
              />

              {showTrialEnd && (
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Trial end date
                  </label>
                  <input
                    type="date"
                    {...register('trialEnd')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                  {errors.trialEnd && (
                    <span className="text-[10px] text-destructive mt-1 block">
                      {errors.trialEnd.message}
                    </span>
                  )}
                </div>
              )}

              {showRenewal && (
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Renewal date (optional)
                  </label>
                  <input
                    type="date"
                    {...register('renewalDate')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                  />
                </div>
              )}

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Platform notes
                </label>
                <textarea
                  {...register('notes')}
                  placeholder="Payment reference, special terms..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface outline-none"
                />
              </div>

              <div className="flex gap-3 pt-2 sticky bottom-0 bg-surface-container/95 pb-1">
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
                  className="w-1/2 bg-primary hover:opacity-90 text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5 disabled:opacity-60"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Apply changes'
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
