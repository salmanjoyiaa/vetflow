import { redirect } from 'next/navigation';
import Link from 'next/link';
import { resolveServerSession } from '@/lib/services/auth';
import { logoutAction } from '@/lib/services/auth-actions';
import { AlertCircle, Building2, LogOut, Stethoscope } from 'lucide-react';

export const metadata = {
  title: 'Account Setup',
  description: 'Complete your VetFlow account setup.',
};

export default async function AccountSetupPage() {
  const session = await resolveServerSession();

  if (!session) {
    redirect('/login');
  }

  if (session.isSuperAdmin) {
    redirect('/super-admin/dashboard');
  }

  if (session.role && session.branches.length > 0) {
    redirect('/dashboard');
  }

  const hasOrg = Boolean(session.organizationId);
  const displayName = session.firstName || session.email.split('@')[0] || 'User';

  return (
    <main className="min-h-screen mesh-gradient flex items-center justify-center p-4">
      <div className="w-full max-w-lg glass-panel p-8 md:p-10">
        <div className="flex flex-col items-center mb-6">
          <div className="w-12 h-12 bg-primary/15 flex items-center justify-center rounded-2xl mb-3">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <h1 className="text-xl font-bold text-on-surface">Welcome, {displayName}</h1>
          <p className="text-xs text-on-surface-variant mt-1 text-center">
            Your sign-in works, but your account still needs clinic access.
          </p>
        </div>

        <div className="space-y-4">
          {!hasOrg ? (
            <div className="border border-tertiary/30 text-tertiary text-sm p-4 rounded-2xl flex gap-3 bg-tertiary/5">
              <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">No clinic linked yet</p>
                <p className="text-xs opacity-90">
                  Register a new clinic to become the administrator, or ask your clinic admin to
                  invite you as staff.
                </p>
              </div>
            </div>
          ) : (
            <div className="border border-secondary/30 text-secondary text-sm p-4 rounded-2xl flex gap-3 bg-secondary/5">
              <Building2 className="w-5 h-5 shrink-0 mt-0.5" />
              <div>
                <p className="font-semibold mb-1">
                  Linked to {session.organizationName || 'your clinic'}
                </p>
                <p className="text-xs opacity-90">
                  You are not assigned to any branch yet. Contact your clinic administrator for
                  branch access.
                </p>
              </div>
            </div>
          )}

          <div className="flex flex-col sm:flex-row gap-3 pt-2">
            {!hasOrg && (
              <Link
                href="/register"
                className="flex-1 text-center bg-primary text-on-primary py-3 px-4 rounded-2xl text-sm font-semibold"
              >
                Register a Clinic
              </Link>
            )}
            {hasOrg && (
              <Link
                href="/dashboard"
                className="flex-1 text-center bg-primary-container text-on-surface py-3 px-4 rounded-2xl text-sm font-semibold"
              >
                Open Dashboard
              </Link>
            )}
            <form action={logoutAction} className="flex-1">
              <button
                type="submit"
                className="w-full border border-outline-variant text-on-surface-variant hover:text-destructive py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2"
              >
                <LogOut className="w-4 h-4" />
                Sign Out
              </button>
            </form>
          </div>
        </div>
      </div>
    </main>
  );
}
