import { redirect } from 'next/navigation';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import DeniedState from '@/components/ui/premium/DeniedState';
import StaffForm from '@/components/forms/StaffForm';
import StaffListClient from '@/components/dashboard/StaffListClient';
import StaffScheduleClient, {
  type ShiftRow,
  type AttendanceRow,
} from '@/components/dashboard/StaffScheduleClient';
import StaffTabsClient from '@/components/dashboard/StaffTabsClient';
import PageHeader from '@/components/ui/premium/PageHeader';
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

  const nameByUserId = new Map<string, string>();
  const staffList = members.map((member) => {
    const profile = profiles?.find((p) => p.id === member.user_id);
    const fullName = [profile?.first_name, profile?.last_name].filter(Boolean).join(' ') || 'Unnamed';
    nameByUserId.set(member.user_id, fullName);
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

  // ── Schedule & attendance data ──
  const branchNameById = new Map((branches || []).map((b) => [b.id, b.name]));
  const todayIso = new Date().toISOString().slice(0, 10);

  const { data: shiftsData } = await supabase
    .from('shifts')
    .select('id, user_id, branch_id, shift_date, start_time, end_time, notes')
    .eq('organization_id', orgId)
    .gte('shift_date', todayIso)
    .order('shift_date', { ascending: true })
    .order('start_time', { ascending: true })
    .limit(50);

  const shiftRows: ShiftRow[] = (shiftsData || []).map((s) => ({
    id: s.id,
    staffName: nameByUserId.get(s.user_id) || 'Unknown',
    branchName: branchNameById.get(s.branch_id) || 'Unknown branch',
    shiftDate: s.shift_date,
    startTime: s.start_time,
    endTime: s.end_time,
    notes: s.notes,
  }));

  const { data: attendanceData } = await supabase
    .from('attendance_records')
    .select('user_id, status, check_in_at, check_out_at')
    .eq('organization_id', orgId)
    .eq('work_date', todayIso);

  type AttendanceRecord = {
    user_id: string;
    status: string | null;
    check_in_at: string | null;
    check_out_at: string | null;
  };
  const attendanceByUser = new Map<string, AttendanceRecord>(
    ((attendanceData || []) as unknown as AttendanceRecord[]).map((a) => [a.user_id, a])
  );

  // Show every active non-admin staff member, with their attendance if present.
  const attendanceRows: AttendanceRow[] = members
    .filter((m) => m.is_active && m.role !== 'clinic_admin')
    .map((m) => {
      const rec = attendanceByUser.get(m.user_id);
      return {
        userId: m.user_id,
        staffName: nameByUserId.get(m.user_id) || 'Unknown',
        role: m.role,
        status: rec?.status ?? null,
        checkInAt: rec?.check_in_at ?? null,
        checkOutAt: rec?.check_out_at ?? null,
      };
    });

  const staffOptions = staffList
    .filter((s) => s.role !== 'clinic_admin' && s.isActive)
    .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Staff Management"
        description="Invite clinic members, bind roles, schedule shifts, and track attendance."
        icon={Users}
        actions={<StaffForm branches={branches || []} />}
      />
      <StaffTabsClient
        team={<StaffListClient initialStaff={staffList} branches={branches || []} />}
        schedule={
          <StaffScheduleClient
            staff={staffOptions}
            branches={branches || []}
            shifts={shiftRows}
            attendance={attendanceRows}
            attendanceDate={todayIso}
          />
        }
      />
    </div>
  );
}

