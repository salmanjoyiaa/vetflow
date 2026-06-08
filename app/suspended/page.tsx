import Link from 'next/link';
import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { ShieldAlert } from 'lucide-react';
import AuthPageShell from '@/components/layout/AuthPageShell';

export const metadata = {
  title: 'Account Suspended — ClinixDev',
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
    <AuthPageShell
      title="Account"
      titleAccent="suspended"
      subtitle="Trustworthy veterinary business platform"
      headerIcon={<ShieldAlert className="w-12 h-12 text-destructive" />}
    >
      <p className="text-sm text-on-surface-variant/80 text-center leading-relaxed mb-6">
        {ctx.organizationName ?? 'Your clinic'} has been suspended. Staff cannot access dashboard
        features until ClinixDev support reactivates the account.
      </p>
      <p className="text-xs text-on-surface-variant/60 text-center mb-8">
        Contact ClinixDev support or your platform administrator for assistance.
      </p>
      <div className="flex flex-col gap-3">
        <Link
          href="/dashboard/upgrade"
          className="btn-sheen text-center bg-primary text-on-primary py-3.5 px-4 rounded-2xl text-sm font-bold shadow-premium hover:opacity-90 transition-all"
        >
          View subscription status
        </Link>
        <Link
          href="/login"
          className="text-xs text-on-surface-variant/70 hover:text-on-surface text-center transition-colors"
        >
          Sign out and return to login
        </Link>
      </div>
    </AuthPageShell>
  );
}
