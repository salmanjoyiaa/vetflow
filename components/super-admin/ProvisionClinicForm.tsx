'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ProvisionClinicSchema, type ProvisionClinicInput } from '@/lib/validations/auth';
import { provisionClinicAction } from '@/lib/services/super-admin-actions';
import { Loader2, Building2, CheckCircle2 } from 'lucide-react';
import Select from '@/components/ui/premium/Select';

interface ClinicTypeOption {
  id: string;
  label: string;
}

interface Props {
  clinicTypes: ClinicTypeOption[];
}

const PLANS = [
  { id: 'trial', label: 'Trial (30 days)' },
  { id: 'starter', label: 'Starter' },
  { id: 'pro', label: 'Pro' },
  { id: 'enterprise', label: 'Enterprise' },
] as const;

const inputCls =
  'w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-sm text-on-surface';
const labelCls =
  'block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5';

export default function ProvisionClinicForm({ clinicTypes }: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    formState: { errors },
  } = useForm<ProvisionClinicInput>({
    resolver: zodResolver(ProvisionClinicSchema),
    defaultValues: { clinicTypeId: 'vet', planId: 'trial' },
  });

  const orgName = watch('orgName');
  const clinicTypeId = watch('clinicTypeId');
  const planId = watch('planId');
  const autoSlug = () => {
    if (orgName) {
      setValue(
        'orgSlug',
        orgName.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/(^-|-$)+/g, ''),
        { shouldValidate: true }
      );
    }
  };

  const onSubmit = async (data: ProvisionClinicInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await provisionClinicAction(data);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/super-admin/organizations');
          router.refresh();
        }, 1500);
      } else {
        setError(res.error || 'Failed to provision clinic.');
        setIsLoading(false);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="glass-panel border border-outline-variant/40 p-8 text-center rounded-2xl">
        <div className="w-14 h-14 bg-emerald-500/10 flex items-center justify-center rounded-full mx-auto mb-4">
          <CheckCircle2 className="w-7 h-7 text-emerald-600" />
        </div>
        <h3 className="text-lg font-bold text-on-surface">Clinic provisioned</h3>
        <p className="text-sm text-on-surface-variant/70 mt-2">
          The tenant and its admin account are ready. Redirecting to the registry…
        </p>
      </div>
    );
  }

  return (
    <form
      onSubmit={handleSubmit(onSubmit)}
      className="glass-panel border border-outline-variant/40 p-6 md:p-8 rounded-2xl space-y-8"
    >
      {error && (
        <div className="p-4 bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-2xl">
          {error}
        </div>
      )}

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
          <Building2 className="w-4 h-4 text-primary" />
          Clinic tenant
        </h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Clinic name</label>
            <input {...register('orgName')} className={inputCls} placeholder="e.g. VetCare Center" />
            {errors.orgName && <span className="text-xs text-destructive mt-1 block">{errors.orgName.message}</span>}
          </div>
          <div>
            <div className="flex justify-between items-center mb-1.5">
              <label className="text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">Web slug</label>
              <button type="button" onClick={autoSlug} className="text-[10px] text-primary font-semibold hover:underline">
                Auto-fill
              </button>
            </div>
            <input {...register('orgSlug')} className={inputCls} placeholder="e.g. vetcare-center" />
            {errors.orgSlug && <span className="text-xs text-destructive mt-1 block">{errors.orgSlug.message}</span>}
          </div>
          <div>
            <label className={labelCls}>Clinic type</label>
            <Select
              value={clinicTypeId}
              onChange={(v) => setValue('clinicTypeId', v, { shouldValidate: true })}
              options={clinicTypes.map((t) => ({ value: t.id, label: t.label }))}
            />
          </div>
          <div>
            <label className={labelCls}>Plan</label>
            <Select
              value={planId}
              onChange={(v) => setValue('planId', v as ProvisionClinicInput['planId'], { shouldValidate: true })}
              options={PLANS.map((p) => ({ value: p.id, label: p.label }))}
            />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Clinic administrator</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>First name</label>
            <input {...register('firstName')} className={inputCls} placeholder="John" />
            {errors.firstName && <span className="text-xs text-destructive mt-1 block">{errors.firstName.message}</span>}
          </div>
          <div>
            <label className={labelCls}>Last name</label>
            <input {...register('lastName')} className={inputCls} placeholder="Doe" />
            {errors.lastName && <span className="text-xs text-destructive mt-1 block">{errors.lastName.message}</span>}
          </div>
          <div>
            <label className={labelCls}>Admin email</label>
            <input type="email" {...register('email')} className={inputCls} placeholder="admin@vetcare.com" />
            {errors.email && <span className="text-xs text-destructive mt-1 block">{errors.email.message}</span>}
          </div>
          <div>
            <label className={labelCls}>Temporary password</label>
            <input type="text" {...register('password')} className={inputCls} placeholder="Min 6 characters" />
            {errors.password && <span className="text-xs text-destructive mt-1 block">{errors.password.message}</span>}
          </div>
          <div>
            <label className={labelCls}>Phone (optional)</label>
            <input {...register('phone')} className={inputCls} placeholder="+1 555 123 4567" />
          </div>
        </div>
      </section>

      <section className="space-y-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">Initial branch</h3>
        <div className="grid md:grid-cols-2 gap-4">
          <div>
            <label className={labelCls}>Branch name</label>
            <input {...register('branchName')} className={inputCls} placeholder="Downtown Branch" />
            {errors.branchName && <span className="text-xs text-destructive mt-1 block">{errors.branchName.message}</span>}
          </div>
          <div>
            <label className={labelCls}>Branch phone</label>
            <input {...register('branchPhone')} className={inputCls} placeholder="+1 555 987 6543" />
            {errors.branchPhone && <span className="text-xs text-destructive mt-1 block">{errors.branchPhone.message}</span>}
          </div>
          <div className="md:col-span-2">
            <label className={labelCls}>Branch address</label>
            <input {...register('branchAddress')} className={inputCls} placeholder="123 Main St, Uptown" />
            {errors.branchAddress && <span className="text-xs text-destructive mt-1 block">{errors.branchAddress.message}</span>}
          </div>
        </div>
      </section>

      <div className="flex justify-end pt-2">
        <button
          type="submit"
          disabled={isLoading}
          className="bg-primary hover:opacity-90 text-white py-3 px-8 rounded-2xl font-bold text-sm shadow-premium flex items-center gap-2 transition-all disabled:opacity-75"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Provisioning…
            </>
          ) : (
            'Provision clinic'
          )}
        </button>
      </div>
    </form>
  );
}
