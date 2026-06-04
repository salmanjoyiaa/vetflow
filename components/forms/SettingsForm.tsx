'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { updateSettingsAction } from '@/lib/services/settings-actions';
import { SettingsSchema, type SettingsInput } from '@/lib/validations/schemas';
import { Loader2, Save } from 'lucide-react';

interface SettingsFormProps {
  defaultValues: SettingsInput;
}

export default function SettingsForm({ defaultValues }: SettingsFormProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<SettingsInput>({
    resolver: zodResolver(SettingsSchema),
    defaultValues,
  });

  const onSubmit = async (data: SettingsInput) => {
    setIsLoading(true);
    setError(null);
    setSuccess(false);
    try {
      const res = await updateSettingsAction(data);
      if (res.success) {
        setSuccess(true);
        router.refresh();
      } else {
        setError(res.error || 'Failed to save settings');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-8">
      {error && (
        <div className="p-4 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-2xl">
          {error}
        </div>
      )}
      {success && (
        <div className="p-4 bg-emerald-500/5 border border-emerald-500/20 text-emerald-700 text-xs rounded-2xl">
          Settings saved successfully.
        </div>
      )}

      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Clinic Preferences</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
              Timezone
            </label>
            <input
              {...register('timezone')}
              className="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/80 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
            />
            {errors.timezone && (
              <span className="text-xs text-destructive mt-1 block">{errors.timezone.message}</span>
            )}
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
              Currency
            </label>
            <input
              {...register('currency')}
              className="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/80 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
            />
            {errors.currency && (
              <span className="text-xs text-destructive mt-1 block">{errors.currency.message}</span>
            )}
          </div>
        </div>
      </div>

      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Tax Configuration</h3>
        <label className="flex items-center gap-2 text-xs text-on-surface">
          <input type="checkbox" {...register('isTaxEnabled')} className="rounded border-outline-variant/60" />
          Enable tax on invoices
        </label>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
              Tax Name
            </label>
            <input
              {...register('taxName')}
              className="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/80 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>
          <div>
            <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
              Tax Percentage (%)
            </label>
            <input
              type="number"
              step="0.01"
              {...register('taxPercentage', { valueAsNumber: true })}
              className="w-full px-4 py-2.5 bg-surface-container/30 border border-outline-variant/80 rounded-xl text-sm text-on-surface outline-none focus:border-primary"
            />
          </div>
        </div>
        <div className="flex flex-wrap gap-6 text-xs text-on-surface">
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('appliesToProducts')} className="rounded border-outline-variant/60" />
            Apply to products
          </label>
          <label className="flex items-center gap-2">
            <input type="checkbox" {...register('appliesToServices')} className="rounded border-outline-variant/60" />
            Apply to services
          </label>
        </div>
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="bg-primary hover:bg-primary/95 text-white px-5 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all disabled:opacity-75"
      >
        {isLoading ? <Loader2 className="w-4 h-4 animate-spin" /> : <Save className="w-4 h-4" />}
        Save Settings
      </button>
    </form>
  );
}

