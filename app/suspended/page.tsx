import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { ShieldAlert } from 'lucide-react';

export const metadata = {
  title: 'Account Suspended — VetFlow',
  description: 'Your clinic account has been suspended.',
};

export default async function SuspendedPage() {
  const ctx = await resolveServerAuthContext();

  if (!ctx) {
    redirect('/login');
  }

  if (ctx.isSuperAdmin && !ctx.isImpersonating) {
    redirect('/super-admin/dashboard');
  }

  const isLocked =
    ctx.subscriptionStatus === 'suspended' ||
    ctx.subscriptionStatus === 'cancelled';

  if (!isLocked) {
    redirect('/dashboard');
  }

  return (
    <div className="min-h-screen bg-surface flex flex-col items-center justify-center px-6 text-center">
      <div className="glass-panel max-w-md w-full p-10 rounded-2xl border border-outline-variant/40">
        <ShieldAlert className="w-12 h-12 text-destructive mx-auto mb-4" />
        <h1 className="text-xl font-bold text-on-surface mb-2">
          Account suspended
        </h1>
        <p className="text-sm text-on-surface-variant leading-relaxed mb-6">
          {ctx.organizationName ?? 'Your clinic'} has been suspended. Staff cannot
          access dashboard features until VetFlow support reactivates the account.
        </p>
        <p className="text-xs text-on-surface-variant/70 mb-8">
          Contact VetFlow support or your platform administrator for assistance.
        </p>
        <div className="flex flex-col gap-3">
          <Link
            href="/dashboard/upgrade"
            className="text-sm font-semibold text-primary hover:underline"
          >
            View subscription status
          </Link>
          <Link
            href="/login"
            className="text-xs text-on-surface-variant hover:text-on-surface"
          >
            Sign out and return to login
          </Link>
        </div>
      </div>
    </div>
  );
}
