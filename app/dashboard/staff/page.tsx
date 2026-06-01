import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import { createAdminClient } from '@/lib/supabase/server';
import StaffForm from '@/components/forms/StaffForm';
import StaffListClient from '@/components/dashboard/StaffListClient';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Staff Management',
  description: 'Manage clinic staff, assign roles, and bind branches.',
};

export default async function StaffPage() {
  // 1. Authenticate user & check admin role
  const session = await resolveServerSession();

  if (!session) {
    redirect('/login');
  }

  if (!['clinic_admin', 'super_admin'].includes(session.role || '')) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Access Denied: Only clinic administrators can configure staff accounts.
      </div>
    );
  }

  const adminClient = await createAdminClient();

  // 2. Fetch branches for onboarding selector
  const { data: branches } = await adminClient
    .from('branches')
    .select('id, name')
    .eq('organization_id', session.organizationId)
    .eq('is_active', true);

  // 3. Fetch organization members
  const { data: members, error: membersError } = await adminClient
    .from('organization_members')
    .select('user_id, role, is_active')
    .eq('organization_id', session.organizationId);

  if (membersError || !members) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load staff profiles: {membersError?.message || 'Unknown error'}
      </div>
    );
  }

  const userIds = members.map((m) => m.user_id);

  // 4. Fetch user profiles
  const { data: profiles } = await adminClient
    .from('user_profiles')
    .select('id, first_name, last_name, phone')
    .in('id', userIds);

  // 5. Fetch branch associations
  const { data: branchMembers } = await adminClient
    .from('branch_members')
    .select('user_id, branch_id, branches ( id, name )')
    .in('user_id', userIds);

  // 6. Fetch auth emails in memory using listUsers
  const { data: authUsersData } = await adminClient.auth.admin.listUsers();
  const authUsers = authUsersData?.users || [];

  // 7. Compile staff data structures
  const staffList = members.map((member) => {
    const profile = profiles?.find((p) => p.id === member.user_id);
    const authUser = authUsers.find((u) => u.id === member.user_id);
    
    // Resolve branches
    const memberBranches = branchMembers
      ?.filter((bm) => bm.user_id === member.user_id)
      .map((bm) => ({
        id: bm.branch_id,
        name: (bm.branches as any)?.name || 'Unknown Branch',
      })) || [];

    return {
      id: member.user_id,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      email: authUser?.email || '',
      phone: profile?.phone || '',
      role: member.role,
      isActive: member.is_active,
      branches: memberBranches,
    };
  });

  return (
    <div className="space-y-8">
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary-teal" />
            Staff Management
          </h2>
          <p className="text-xs text-graphite/70 mt-1">
            Invite clinic members, bind roles, and assign branch site access.
          </p>
        </div>

        <StaffForm branches={branches || []} />
      </div>

      {/* STAFF LIST */}
      <StaffListClient initialStaff={staffList} />

    </div>
  );
}
