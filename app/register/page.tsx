'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { RegisterSchema, type RegisterInput } from '@/lib/validations/auth';
import { registerAction } from '@/lib/services/auth-actions';
import { Stethoscope, Loader2, ArrowRight, ArrowLeft, CheckCircle2 } from 'lucide-react';

export default function RegisterPage() {
  const [step, setStep] = useState(1);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    trigger,
    formState: { errors },
  } = useForm<RegisterInput>({
    resolver: zodResolver(RegisterSchema),
    mode: 'onTouched',
  });

  const orgNameWatch = watch('orgName');

  // Auto-generate slug from organization name
  const handleGenerateSlug = () => {
    if (orgNameWatch) {
      const slug = orgNameWatch
        .toLowerCase()
        .replace(/[^a-z0-9]+/g, '-')
        .replace(/(^-|-$)+/g, '');
      setValue('orgSlug', slug, { shouldValidate: true });
    }
  };

  const nextStep = async () => {
    // Validate fields for Step 1
    const step1Valid = await trigger([
      'firstName',
      'lastName',
      'email',
      'password',
      'phone',
    ]);
    if (step1Valid) {
      setStep(2);
    }
  };

  const prevStep = () => {
    setStep(1);
  };

  const onSubmit = async (data: RegisterInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await registerAction(data);
      if (res.success) {
        setSuccess(true);
        setTimeout(() => {
          router.push('/login');
        }, 3000);
      } else {
        setError(res.error || 'Failed to complete registration onboarding');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <main className="min-h-screen mesh-gradient flex items-center justify-center p-4">
        <div className="w-full max-w-md glass-panel shadow-premium border border-outline-variant/40 p-8 text-center">
          <div className="w-16 h-16 bg-emerald-500/10 flex items-center justify-center rounded-full mx-auto mb-6">
            <CheckCircle2 className="w-8 h-8 text-emerald-600" />
          </div>
          <h2 className="text-2xl font-bold text-on-surface mb-3">Registration Successful!</h2>
          <p className="text-sm text-on-surface-variant/70 mb-6">
            Your VetFlow organization and initial branch are now fully initialized. Redirecting you to login...
          </p>
          <div className="w-8 h-8 border-2 border-primary-teal border-t-transparent rounded-full animate-spin mx-auto"></div>
        </div>
      </main>
    );
  }

  return (
    <main className="min-h-screen mesh-gradient flex items-center justify-center p-4 md:py-12">
      <div className="w-full max-w-2xl glass-panel shadow-premium border border-outline-variant/40 overflow-hidden flex flex-col md:flex-row">
        
        {/* SIDE BAR DESCRIPTIVE BLOCK */}
        <div className="w-full md:w-5/12 bg-surface-container text-white p-8 flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-8">
              <div className="w-8 h-8 bg-white/10 flex items-center justify-center rounded-xl">
                <Stethoscope className="w-4 h-4 text-primary-light" />
              </div>
              <span className="font-bold tracking-tight">VetFlow</span>
            </div>
            <h3 className="text-xl font-bold text-on-surface">Begin Your 30-Day Sandbox Trial</h3>
            <p className="text-xs text-on-surface/60 mt-3 leading-relaxed">
              Initialize a high-security, multi-tenant veterinary cloud built for medical efficiency. 
              No commitment or credit card needed for sandbox setup.
            </p>
          </div>
          <div className="mt-8 md:mt-0 text-[10px] text-on-surface/40">
            © 2026 VetFlow Inc. All rights reserved.
          </div>
        </div>

        {/* FORM CONTENT */}
        <div className="w-full md:w-7/12 p-8 md:p-10 flex flex-col justify-center">
          
          <div className="mb-6">
            <div className="flex items-center gap-2 text-xs text-on-surface-variant/50 font-semibold mb-2">
              <span>STEP {step} OF 2</span>
              <span className="text-border">•</span>
              <span>{step === 1 ? 'Administrator Settings' : 'Clinic Details'}</span>
            </div>
            <h2 className="text-lg font-bold text-on-surface">Register Clinic Account</h2>
          </div>

          {error && (
            <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-2xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            {/* STEP 1: USER DETAILS */}
            {step === 1 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                      First Name
                    </label>
                    <input
                      type="text"
                      {...register('firstName')}
                      placeholder="e.g. John"
                      className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                    />
                    {errors.firstName && (
                      <span className="text-xs text-destructive mt-1 block">{errors.firstName.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                      Last Name
                    </label>
                    <input
                      type="text"
                      {...register('lastName')}
                      placeholder="e.g. Doe"
                      className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                    />
                    {errors.lastName && (
                      <span className="text-xs text-destructive mt-1 block">{errors.lastName.message}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Contact Email Address
                  </label>
                  <input
                    type="email"
                    {...register('email')}
                    placeholder="e.g. info@vetcare.com"
                    className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                  />
                  {errors.email && (
                    <span className="text-xs text-destructive mt-1 block">{errors.email.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Contact Phone Number
                  </label>
                  <input
                    type="text"
                    {...register('phone')}
                    placeholder="e.g. +1 555 123 4567"
                    className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                  />
                  {errors.phone && (
                    <span className="text-xs text-destructive mt-1 block">{errors.phone.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Account Security Password
                  </label>
                  <input
                    type="password"
                    {...register('password')}
                    placeholder="Minimum 6 characters"
                    className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                  />
                  {errors.password && (
                    <span className="text-xs text-destructive mt-1 block">{errors.password.message}</span>
                  )}
                </div>

                <button
                  type="button"
                  onClick={nextStep}
                  className="w-full mt-2 bg-surface-container hover:bg-primary text-white py-3 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2"
                >
                  Continue to Clinic Info
                  <ArrowRight className="w-4 h-4" />
                </button>
              </div>
            )}

            {/* STEP 2: CLINIC DETAILS */}
            {step === 2 && (
              <div className="space-y-4">
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                      Clinic/Business Name
                    </label>
                    <input
                      type="text"
                      {...register('orgName')}
                      placeholder="e.g. VetCare Center"
                      className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                    />
                    {errors.orgName && (
                      <span className="text-xs text-destructive mt-1 block">{errors.orgName.message}</span>
                    )}
                  </div>
                  <div>
                    <div className="flex justify-between items-center mb-1.5">
                      <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
                        Web Slug
                      </label>
                      <button
                        type="button"
                        onClick={handleGenerateSlug}
                        className="text-[10px] text-primary font-semibold hover:underline"
                      >
                        Auto-fill
                      </button>
                    </div>
                    <input
                      type="text"
                      {...register('orgSlug')}
                      placeholder="e.g. vetcare-center"
                      className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                    />
                    {errors.orgSlug && (
                      <span className="text-xs text-destructive mt-1 block">{errors.orgSlug.message}</span>
                    )}
                  </div>
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Initial Branch Name
                  </label>
                  <input
                    type="text"
                    {...register('branchName')}
                    placeholder="e.g. Downtown Branch"
                    className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                  />
                  {errors.branchName && (
                    <span className="text-xs text-destructive mt-1 block">{errors.branchName.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Branch Address
                  </label>
                  <input
                    type="text"
                    {...register('branchAddress')}
                    placeholder="e.g. 123 Main St, Uptown"
                    className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                  />
                  {errors.branchAddress && (
                    <span className="text-xs text-destructive mt-1 block">{errors.branchAddress.message}</span>
                  )}
                </div>

                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Branch Phone Number
                  </label>
                  <input
                    type="text"
                    {...register('branchPhone')}
                    placeholder="e.g. +1 555 987 6543"
                    className="w-full px-3 py-2.5 bg-surface/30 border border-outline-variant/85 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-sm text-on-surface"
                  />
                  {errors.branchPhone && (
                    <span className="text-xs text-destructive mt-1 block">{errors.branchPhone.message}</span>
                  )}
                </div>

                <div className="flex gap-4 pt-2">
                  <button
                    type="button"
                    onClick={prevStep}
                    className="w-1/2 border border-outline-variant hover:bg-surface/40 text-on-surface py-3 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 flex items-center justify-center gap-2"
                  >
                    <ArrowLeft className="w-4 h-4" />
                    Back
                  </button>

                  <button
                    type="submit"
                    disabled={isLoading}
                    className="w-1/2 bg-surface-container hover:bg-primary text-white py-3 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-75"
                  >
                    {isLoading ? (
                      <>
                        <Loader2 className="w-4 h-4 animate-spin" />
                        Finishing...
                      </>
                    ) : (
                      'Register Clinic'
                    )}
                  </button>
                </div>
              </div>
            )}
          </form>

          {/* FOOTER */}
          <div className="mt-6 pt-6 border-t border-outline-variant/40 text-center text-xs text-on-surface-variant/60 font-sans">
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

