'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import Link from 'next/link';
import { useRouter } from 'next/navigation';
import { LoginSchema, type LoginInput } from '@/lib/validations/auth';
import { loginAction } from '@/lib/services/auth-actions';
import { Eye, EyeOff, Stethoscope, Loader2 } from 'lucide-react';

export default function LoginPage() {
  const [showPassword, setShowPassword] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<LoginInput>({
    resolver: zodResolver(LoginSchema),
  });

  const onSubmit = async (data: LoginInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await loginAction(data);
      if (res.success && res.redirectTo) {
        router.push(res.redirectTo);
        router.refresh();
      } else {
        setError(res.error || 'Invalid credentials');
        setIsLoading(false);
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
      setIsLoading(false);
    }
  };

  return (
    <main className="min-h-screen bg-primary-ivory flex items-center justify-center p-4">
      <div className="w-full max-w-md bg-white rounded-3xl shadow-premium border border-border/40 p-8 md:p-10">
        
        {/* LOGO */}
        <div className="flex flex-col items-center mb-8">
          <div className="w-12 h-12 bg-primary-teal/5 flex items-center justify-center rounded-2xl mb-3">
            <Stethoscope className="w-6 h-6 text-primary-teal" />
          </div>
          <h1 className="text-2xl font-bold tracking-tight text-primary-navy font-sans">VetFlow</h1>
          <p className="text-xs text-graphite/60 mt-1">Trustworthy Veterinary Business Platform</p>
        </div>

        {/* HEADER */}
        <div className="mb-6 text-center">
          <h2 className="text-xl font-semibold text-primary-navy">Welcome Back</h2>
          <p className="text-sm text-graphite/70 mt-1">Sign in to manage your clinic branch</p>
        </div>

        {/* ALERTS */}
        {error && (
          <div className="mb-6 p-4 bg-destructive/5 border border-destructive/20 text-destructive text-sm rounded-2xl">
            {error}
          </div>
        )}

        {/* FORM */}
        <form onSubmit={handleSubmit(onSubmit)} className="space-y-5">
          <div>
            <label className="block text-xs font-semibold text-primary-navy/80 uppercase tracking-wider mb-2">
              Email Address
            </label>
            <input
              type="email"
              {...register('email')}
              placeholder="e.g. receptionist@vetcare.com"
              className="w-full px-4 py-3 bg-primary-ivory/30 border border-border/80 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-2xl outline-none transition-colors text-sm text-primary-navy"
            />
            {errors.email && (
              <span className="text-xs text-destructive mt-1 block">{errors.email.message}</span>
            )}
          </div>

          <div>
            <label className="block text-xs font-semibold text-primary-navy/80 uppercase tracking-wider mb-2">
              Password
            </label>
            <div className="relative">
              <input
                type={showPassword ? 'text' : 'password'}
                {...register('password')}
                placeholder="Enter password"
                className="w-full pl-4 pr-12 py-3 bg-primary-ivory/30 border border-border/80 focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-2xl outline-none transition-colors text-sm text-primary-navy"
              />
              <button
                type="button"
                onClick={() => setShowPassword(!showPassword)}
                className="absolute right-4 top-1/2 -translate-y-1/2 text-graphite/40 hover:text-primary-teal transition-colors"
              >
                {showPassword ? <EyeOff className="w-5 h-5" /> : <Eye className="w-5 h-5" />}
              </button>
            </div>
            {errors.password && (
              <span className="text-xs text-destructive mt-1 block">{errors.password.message}</span>
            )}
          </div>

          <button
            type="submit"
            disabled={isLoading}
            className="w-full bg-primary-navy hover:bg-primary-teal text-white py-3.5 px-4 rounded-2xl font-semibold text-sm transition-all duration-200 shadow-sm flex items-center justify-center gap-2 disabled:opacity-75 disabled:cursor-not-allowed"
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

        {/* FOOTER */}
        <div className="mt-8 pt-6 border-t border-border/40 text-center text-xs text-graphite/60">
          First time here?{' '}
          <Link href="/register" className="text-primary-teal font-semibold hover:underline">
            Register your clinic
          </Link>
        </div>

      </div>
    </main>
  );
}
