import { redirect } from 'next/navigation';
import Link from 'next/link';
import { isDemoMode } from '@/lib/demo/credentials';
import {
  resolveServerSession,
  resolveAuthenticatedDestination,
  getAuthenticatedAuthUser,
  getProfileBootstrapStatus,
  isServiceRoleConfigured,
  type ProfileBootstrapStatus,
  type UserSessionDetails,
} from '@/lib/services/auth';
import { logoutAction } from '@/lib/services/auth-actions';
import AuthPageShell from '@/components/layout/AuthPageShell';
import { AlertCircle, Building2, LogOut, RefreshCw } from 'lucide-react';

export const metadata = {
  title: 'Account Setup',
  description: 'Complete your ClinixDev account setup.',
};

function bootstrapMessage(status: ProfileBootstrapStatus | null, missingServiceRole: boolean): string {
  if (missingServiceRole || status === 'missing_service_role') {
    return 'Your account signed in successfully, but the server cannot create your profile record because SUPABASE_SERVICE_ROLE_KEY is not configured. Ask your administrator to add it on Vercel, then try again.';
  }
  if (status === 'upsert_failed') {
    return 'We could not provision your profile in the database. Wait a moment and refresh, or contact support if this continues.';
  }
  return 'Your sign-in succeeded, but your ClinixDev profile is not ready yet. Contact your platform administrator to finish clinic provisioning.';
}

function SetupActions({
  hasOrg,
  showRegister,
}: {
  hasOrg: boolean;
  showRegister: boolean;
}) {
  return (
    <div className="flex flex-col sm:flex-row gap-3 pt-2">
      {showRegister && (
        <Link
          href="/register"
          className="flex-1 text-center btn-sheen bg-primary text-on-primary py-3 px-4 rounded-2xl text-sm font-bold shadow-premium hover:opacity-90 transition-all"
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
  );
}

function ProfilePendingPanel({
  email,
  bootstrapStatus,
}: {
  email: string;
  bootstrapStatus: ProfileBootstrapStatus | null;
}) {
  const missingServiceRole =
    !isServiceRoleConfigured() || bootstrapStatus === 'missing_service_role';

  return (
    <AuthPageShell
      title="Finishing"
      titleAccent="account setup"
      subtitle="Trustworthy veterinary business platform"
      footer={
        <>
          Need a fresh start?{' '}
          <Link href="/login?reauth=1" className="text-primary font-semibold hover:underline">
            Sign in again
          </Link>
        </>
      }
    >
      <div className="space-y-4">
        <div className="border border-destructive/30 text-destructive text-sm p-4 rounded-2xl flex gap-3 bg-destructive/5">
          <AlertCircle className="w-5 h-5 shrink-0 mt-0.5" />
          <div>
            <p className="font-semibold mb-1">Profile not provisioned</p>
            <p className="text-xs opacity-90">{bootstrapMessage(bootstrapStatus, missingServiceRole)}</p>
            <p className="text-[10px] mt-2 opacity-70">Signed in as {email}</p>
          </div>
        </div>

        <div className="flex flex-col sm:flex-row gap-3">
          <Link
            href="/account-setup"
            className="flex-1 text-center border border-outline-variant text-on-surface py-3 px-4 rounded-2xl text-sm font-semibold flex items-center justify-center gap-2 hover:bg-surface-container-high"
          >
            <RefreshCw className="w-4 h-4" />
            Try again
          </Link>
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
    </AuthPageShell>
  );
}

function AccountSetupContent({ session }: { session: UserSessionDetails }) {
  const hasOrg = Boolean(session.organizationId);
  const displayName = session.firstName || session.email.split('@')[0] || 'User';

  return (
    <AuthPageShell
      title="Welcome,"
      titleAccent={displayName}
      subtitle="Your sign-in works, but your account still needs clinic access"
      footer={
        <>
          Wrong account?{' '}
          <Link href="/login?reauth=1" className="text-primary font-semibold hover:underline">
            Sign in with a different email
          </Link>
        </>
      }
    >
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

        <SetupActions hasOrg={hasOrg} showRegister={!hasOrg} />
      </div>
    </AuthPageShell>
  );
}

export default async function AccountSetupPage() {
  if (isDemoMode()) {
    const session = await resolveServerSession();
    if (!session) {
      redirect('/login');
    }
    const dest = resolveAuthenticatedDestination(session);
    if (dest !== '/account-setup') {
      redirect(dest);
    }
    return <AccountSetupContent session={session} />;
  }

  const authUser = await getAuthenticatedAuthUser();
  if (!authUser) {
    redirect('/login');
  }

  const session = await resolveServerSession();
  if (!session) {
    const bootstrapStatus = await getProfileBootstrapStatus();
    return (
      <ProfilePendingPanel
        email={authUser.email || 'your account'}
        bootstrapStatus={bootstrapStatus}
      />
    );
  }

  const dest = resolveAuthenticatedDestination(session);
  if (dest !== '/account-setup') {
    redirect(dest);
  }

  return <AccountSetupContent session={session} />;
}
