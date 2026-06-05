import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import SuperAdminShellClient from '@/components/layout/SuperAdminShellClient';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveServerSession();

  if (!session || !session.isSuperAdmin) {
    redirect('/login');
  }

  const displayName = [session.firstName || 'User', session.lastName].filter(Boolean).join(' ');
  const avatarInitial = (session.firstName?.charAt(0) || session.email?.charAt(0) || 'U').toUpperCase();

  return (
    <SuperAdminShellClient displayName={displayName} avatarInitial={avatarInitial}>
      {children}
    </SuperAdminShellClient>
  );
}
