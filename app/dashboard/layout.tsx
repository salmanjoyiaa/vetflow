import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import DashboardShellClient from '@/components/layout/DashboardShellClient';

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

  if (!ctx.role) {
    redirect('/account-setup');
  }

  return (
    <DashboardShellClient
      session={ctx}
      activeBranchId={ctx.activeBranchId ?? undefined}
    >
      {children}
    </DashboardShellClient>
  );
}

