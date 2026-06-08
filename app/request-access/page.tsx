'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { RequestAccessSchema, type RequestAccessInput } from '@/lib/validations/auth';
import { requestAccessAction } from '@/lib/services/auth-actions';
import { Stethoscope, Loader2, CheckCircle2, ShieldCheck } from 'lucide-react';

const inputCls =
  'w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-sm text-on-surface';
const labelCls =
  'block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5';

export default function RequestAccessPage() {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<RequestAccessInput>({
    resolver: zodResolver(RequestAccessSchema),
  });

  const onSubmit = async (data: RequestAccessInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await requestAccessAction(data);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Failed to submit your request.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen mesh-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel shadow-premium border border-outline-variant/40 p-8 text-center rounded-2xl">
          <div className="w-16 h-16 bg-emerald-500/10 flex items-center justify-center rounded-full mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-3">Request received</h2>
          <p className="text-sm text-on-surface-variant/70 mb-6">
            Thanks for your interest in ClinixDev. Our team will review your request and reach out to
            set up your clinic workspace.
          </p>
          <Link href="/" className="text-primary font-semibold text-sm hover:underline">
            Back to home
          </Link>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mesh-gradient flex items-center justify-center p-4 md:py-12">
      <div className="w-full max-w-2xl glass-panel shadow-premium border border-outline-variant/40 overflow-hidden flex flex-col md:flex-row rounded-2xl">
        <div className="w-full md:w-5/12 bg-surface-container text-white p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-white/10 flex items-center justify-center rounded-xl">
                <Stethoscope className="w-4 h-4 text-primary-light" />
              </div>
              <span className="font-bold tracking-tight">ClinixDev</span>
            </div>
            <h3 className="text-xl font-bold">Request access</h3>
            <p className="text-xs text-white/60 mt-3 leading-relaxed">
              ClinixDev clinics are provisioned by our team to guarantee secure, compliant,
              multi-tenant isolation. Tell us about your clinic and we'll get you set up.
            </p>
            <div className="mt-6 flex items-center gap-2 text-[11px] text-white/70">
              <ShieldCheck className="w-4 h-4 text-primary-light" />
              HIPAA-ready architecture & audited access
            </div>
          </div>
          <div className="mt-8 md:mt-0 text-[10px] text-white/40">
            © 2026 ClinixDev Inc. All rights reserved.
          </div>
        </div>

        <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
          <h2 className="text-lg font-bold text-on-surface mb-6">Tell us about your clinic</h2>

          {error && (
            <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-2xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className={labelCls}>Your name</label>
              <input {...register('fullName')} className={inputCls} placeholder="Jane Doe" />
              {errors.fullName && <span className="text-xs text-destructive mt-1 block">{errors.fullName.message}</span>}
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Email</label>
                <input type="email" {...register('email')} className={inputCls} placeholder="you@clinic.com" />
                {errors.email && <span className="text-xs text-destructive mt-1 block">{errors.email.message}</span>}
              </div>
              <div>
                <label className={labelCls}>Phone (optional)</label>
                <input {...register('phone')} className={inputCls} placeholder="+1 555 123 4567" />
              </div>
            </div>
            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className={labelCls}>Clinic name</label>
                <input {...register('clinicName')} className={inputCls} placeholder="VetCare Center" />
                {errors.clinicName && <span className="text-xs text-destructive mt-1 block">{errors.clinicName.message}</span>}
              </div>
              <div>
                <label className={labelCls}>Clinic type</label>
                <select {...register('clinicType')} className={inputCls}>
                  <option value="">Select…</option>
                  <option value="vet">Veterinary</option>
                  <option value="dental">Dental</option>
                  <option value="general">General</option>
                  <option value="specialty">Specialty</option>
                </select>
              </div>
            </div>
            <div>
              <label className={labelCls}>Message (optional)</label>
              <textarea
                {...register('message')}
                rows={3}
                className={inputCls}
                placeholder="Tell us about your clinic size, branches, and what you need."
              />
            </div>

            <button
              type="submit"
              disabled={isLoading}
              className="w-full mt-2 bg-surface-container hover:bg-primary text-white py-3 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-75"
            >
              {isLoading ? (
                <>
                  <Loader2 className="w-4 h-4 animate-spin" />
                  Submitting…
                </>
              ) : (
                'Request access'
              )}
            </button>
          </form>

          <div className="mt-6 pt-6 border-t border-outline-variant/40 text-center text-xs text-on-surface-variant/60">
            Already have an account?{' '}
            <Link href="/login" className="text-primary font-semibold hover:underline">
              Sign In
            </Link>
          </div>
        </div>
      </div>
    </main>
  );
}
