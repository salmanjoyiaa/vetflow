import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import DashboardShellClient from '@/components/layout/DashboardShellClient';
import { NavigationLoadingProvider } from '@/components/layout/NavigationLoadingProvider';
import FaviconLoadingIndicator from '@/components/layout/FaviconLoadingIndicator';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const ctx = await resolveServerAuthContext();

  if (!ctx) {
    redirect('/login');
  }

  if (ctx.isSuperAdmin && !ctx.isImpersonating) {
    redirect('/super-admin/dashboard');
  }

  if (!ctx.isImpersonating && (!ctx.role || ctx.branches.length === 0)) {
    redirect('/account-setup');
  }

  return (
    <NavigationLoadingProvider>
      <FaviconLoadingIndicator />
      <DashboardShellClient
        session={ctx}
        activeBranchId={ctx.activeBranchId ?? undefined}
      >
        {children}
      </DashboardShellClient>
    </NavigationLoadingProvider>
  );
}

