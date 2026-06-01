import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerSession } from '@/lib/services/auth';
import DashboardShellClient from '@/components/layout/DashboardShellClient';

export default async function DashboardLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  // 1. Authenticate user & resolve organization context on the server
  const session = await resolveServerSession();

  if (!session) {
    redirect('/login');
  }

  // 2. Read active branch ID from cookies
  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('vetflow_branch_id')?.value;

  // Determine active branch (must belong to user's authorized branches list)
  let activeBranchId = activeBranchCookie;
  if (!activeBranchId && session.branches.length > 0) {
    activeBranchId = session.branches[0].id;
  } else if (activeBranchId && !session.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = session.branches[0]?.id || undefined;
  }

  return (
    <DashboardShellClient 
      session={session} 
      activeBranchId={activeBranchId}
    >
      {children}
    </DashboardShellClient>
  );
}
