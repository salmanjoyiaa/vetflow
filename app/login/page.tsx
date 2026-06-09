'use client';

import { useState, Suspense } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useSearchParams } from 'next/navigation';
import { LoginSchema, type LoginInput } from '@/lib/validations/auth';
import { loginAction } from '@/lib/services/auth-actions';
import AuthPageShell from '@/components/layout/AuthPageShell';
import { Eye, EyeOff, Loader2, Shield, Stethoscope, ClipboardList, Building2, UserPlus } from 'lucide-react';

const isDemoMode = process.env.NEXT_PUBLIC_DEMO_MODE === 'true';

const DEMO_CREDENTIALS = [
  {
    label: 'Super Admin',
    email: 'salmanjoyiaa@gmail.com',
    password: 'password123',
    icon: Shield,
    color: 'text-violet-400',
    bg: 'bg-violet-500/10 border-violet-500/20',
    desc: 'Platform-wide admin console',
  },
  {
    label: 'Clinic Admin',
    email: 'admin.a@vetcare.com',
    password: 'password123',
    icon: Building2,
    color: 'text-primary',
    bg: 'bg-primary/10 border-primary/20',
    desc: 'Full clinic management access',
  },
  {
    label: 'Doctor',
    email: 'doctor.a@vetcare.com',
    password: 'password123',
    icon: Stethoscope,
    color: 'text-emerald-400',
    bg: 'bg-emerald-500/10 border-emerald-500/20',
    desc: 'Clinical queue & prescriptions',
  },
  {
    label: 'Receptionist',
    email: 'receptionist.a@vetcare.com',
    password: 'password123',
    icon: ClipboardList,
    color: 'text-amber-400',
    bg: 'bg-amber-500/10 border-amber-500/20',
    desc: 'Walk-ins, billing & intake',
  },
  {
    label: 'New User',
    email: 'setup.demo@clinixdev.com',
    password: 'password123',
    icon: UserPlus,
    color: 'text-rose-400',
    bg: 'bg-rose-500/10 border-rose-500/20',
    desc: 'Unassigned role (setup)',
  },
];

const inputClass =
  'w-full px-4 py-3 bg-surface-container border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-2xl outline-none text-sm text-on-surface';

function resolveRedirectTarget(redirectTo: string, nextParam: string | null): string {
  if (nextParam && redirectTo === '/dashboard') {
    const safe =
      nextParam.startsWith('/') &&
      !nextParam.startsWith('//') &&
      !nextParam.startsWith('/login') &&
      !nextParam.startsWith('/register');
    if (safe) {
      return nextParam;
    }
  }
  return redirectTo;
}

function LoginForm() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const [loadingDemo, setLoadingDemo] = useState<string | null>(null);
  const searchParams = useSearchParams();
  const nextParam = searchParams.get('next');

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const navigateAfterLogin = (redirectTo: string) => {
    const target = resolveRedirectTarget(redirectTo, nextParam);
    window.location.assign(target);
  };

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginAction(data);
      if (res.success && res.redirectTo) {
        navigateAfterLogin(res.redirectTo);
      } else {
        setError(res.error || 'Invalid credentials');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  const handleDemoLogin = async (email: string, password: string) => {
    setLoadingDemo(email);
    setError(null);
    try {
      const res = await loginAction({ email, password });
      if (res.success && res.redirectTo) {
        navigateAfterLogin(res.redirectTo);
      } else {
        setError(res.error || 'Demo login failed');
      }
    } catch {
      setError('Demo login failed');
    } finally {
      setLoadingDemo(null);
    }
  };

  return (
    <AuthPageShell
      title="Welcome"
      titleAccent="back"
      subtitle="Trustworthy veterinary business platform"
      footer={
        <>
          First time here?{' '}
          <Link href="/register" className="text-primary font-semibold hover:underline">
            Register your clinic
          </Link>
        </>
      }
    >
      {error && (
        <div className="mb-6 p-4 border border-destructive/30 text-destructive text-sm rounded-2xl bg-destructive/10">
          {error}
        </div>
      )}

      {isDemoMode && (
        <div className="mb-6 rounded-2xl border border-primary/20 bg-primary/5 p-4">
          <div className="flex items-center gap-2 mb-3">
            <div className="w-2 h-2 rounded-full bg-emerald-400 animate-pulse" />
            <span className="text-[10px] font-bold text-primary uppercase tracking-widest">
              Demo Mode — Quick Login
            </span>
          </div>
          <div className="grid grid-cols-2 gap-2">
            {DEMO_CREDENTIALS.map((cred) => {
              const Icon = cred.icon;
              return (
                <button
                  key={cred.email}
                  type="button"
                  onClick={() => handleDemoLogin(cred.email, cred.password)}
                  disabled={loadingDemo === cred.email}
                  className={`${cred.bg} border rounded-xl p-3 text-left hover:scale-[1.02] transition-all group disabled:opacity-60`}
                >
                  <div className="flex items-center gap-2 mb-1">
                    {loadingDemo === cred.email ? (
                      <Loader2 className={`w-3.5 h-3.5 ${cred.color} animate-spin`} />
                    ) : (
                      <Icon className={`w-3.5 h-3.5 ${cred.color}`} />
                    )}
                    <span className="text-[11px] font-bold text-on-surface">{cred.label}</span>
                  </div>
                  <span className="text-[9px] text-on-surface-variant/60 block">{cred.desc}</span>
                </button>
              );
            })}
          </div>
          <p className="text-[9px] text-on-surface-variant/40 mt-2 text-center">
            All demo accounts use password: <code className="font-mono text-primary/80">password123</code>
          </p>
        </div>
      )}

      <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            Email
          </label>
          <input type="email" {...register('email')} placeholder="you@clinic.com" className={inputClass} />
          {errors.email && (
            <span className="text-xs text-destructive mt-1 block">{errors.email.message}</span>
          )}
        </div>

        <div>
          <label className="block text-xs font-semibold text-on-surface-variant uppercase tracking-wider mb-2">
            Password
          </label>
          <div className="relative">
            <input
              type={showPassword ? 'text' : 'password'}
              {...register('password')}
              placeholder="Enter password"
              autoComplete="current-password"
              className={`${inputClass} password-field pr-11`}
            />
            <button
              type="button"
              onClick={() => setShowPassword(!showPassword)}
              aria-label={showPassword ? 'Hide password' : 'Show password'}
              className="absolute right-3 top-1/2 -translate-y-1/2 text-outline hover:text-primary p-1"
            >
              {showPassword ? <EyeOff className="w-4 h-4" /> : <Eye className="w-4 h-4" />}
            </button>
          </div>
          {errors.password && (
            <span className="text-xs text-destructive mt-1 block">{errors.password.message}</span>
          )}
        </div>

        <button
          type="submit"
          disabled={isLoading}
          className="w-full btn-sheen bg-primary text-on-primary py-3.5 rounded-2xl font-bold text-sm shadow-premium flex items-center justify-center gap-2 disabled:opacity-75 hover:opacity-90 transition-all"
        >
          {isLoading ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Signing in...
            </>
          ) : (
            'Sign In'
          )}
        </button>
      </form>
    </AuthPageShell>
  );
}

export default function LoginPage() {
  return (
    <Suspense fallback={null}>
      <LoginForm />
    </Suspense>
  );
}
