import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import DeniedState from '@/components/ui/premium/DeniedState';
import StaffForm from '@/components/forms/StaffForm';
import StaffListClient from '@/components/dashboard/StaffListClient';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Staff Management',
  description: 'Manage clinic staff, assign roles, and bind branches.',
};

export default async function StaffPage() {
  const ctx = await resolveServerAuthContext();

  if (!ctx) {
    redirect('/login');
  }

  try {
    assertCapability(ctx, 'manage_staff');
  } catch {
    return (
      <DeniedState
        title="Staff management restricted"
        message="Only clinic administrators can configure staff accounts."
      />
    );
  }

  const supabase = await createClient();
  const orgId = ctx.organizationId!;

  const { data: branches } = await supabase
    .from('branches')
    .select('id, name')
    .eq('organization_id', orgId)
    .eq('is_active', true);

  const { data: members, error: membersError } = await supabase
    .from('organization_members')
    .select('user_id, role, is_active')
    .eq('organization_id', orgId);

  if (membersError || !members) {
    return (
      <DeniedState
        title="Failed to load staff"
        message={membersError?.message || 'Unknown error'}
      />
    );
  }

  const userIds = members.map((m) => m.user_id);

  const { data: profiles } = await supabase
    .from('user_profiles')
    .select('id, first_name, last_name, phone')
    .in('id', userIds);

  const { data: branchMembers } = await supabase
    .from('branch_members')
    .select('user_id, branch_id, branches ( id, name )')
    .in('user_id', userIds);

  const adminClient = await createAdminClient();
  const emailByUserId = new Map<string, string>();
  await Promise.all(
    userIds.map(async (id) => {
      const { data } = await adminClient.auth.admin.getUserById(id);
      if (data.user?.email) {
        emailByUserId.set(id, data.user.email);
      }
    })
  );

  const staffList = members.map((member) => {
    const profile = profiles?.find((p) => p.id === member.user_id);
    const memberBranches =
      branchMembers
        ?.filter((bm) => bm.user_id === member.user_id)
        .map((bm) => ({
          id: bm.branch_id,
          name: (bm.branches as { name?: string } | null)?.name || 'Unknown Branch',
        })) || [];

    return {
      id: member.user_id,
      firstName: profile?.first_name || '',
      lastName: profile?.last_name || '',
      email: emailByUserId.get(member.user_id) || '',
      phone: profile?.phone || '',
      role: member.role,
      isActive: member.is_active,
      branches: memberBranches,
    };
  });

  return (
    <div className="space-y-8">
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
            <Users className="w-5 h-5 text-primary" />
            Staff Management
          </h2>
          <p className="text-xs text-on-surface-variant mt-1">
            Invite clinic members, bind roles, and assign branch site access.
          </p>
        </div>
        <StaffForm branches={branches || []} />
      </div>
      <StaffListClient initialStaff={staffList} />
    </div>
  );
}

