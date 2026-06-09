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
  type DayTemplate,
} from '@/components/dashboard/StaffScheduleClient';
import { syncDailyAttendanceAction } from '@/lib/services/attendance-actions';
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
  await syncDailyAttendanceAction();

  const branchNameById = new Map((branches || []).map((b) => [b.id, b.name]));
  const todayIso = new Date().toISOString().slice(0, 10);
  const todayWeekday = new Date().getDay();

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

  const { data: templatesData } = await supabase
    .from('staff_schedule_templates')
    .select('user_id, branch_id, weekday, start_time, end_time, is_off_day')
    .eq('organization_id', orgId);

  const { data: todayShifts } = await supabase
    .from('shifts')
    .select('user_id, start_time, end_time')
    .eq('organization_id', orgId)
    .eq('shift_date', todayIso);

  const { data: exceptionsData } = await supabase
    .from('staff_schedule_exceptions')
    .select('user_id, is_off_day, start_time, end_time')
    .eq('organization_id', orgId)
    .eq('exception_date', todayIso);

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

  type ScheduleTemplate = {
    user_id: string;
    branch_id: string;
    weekday: number;
    start_time: string | null;
    end_time: string | null;
    is_off_day: boolean;
  };
  type TodayShift = { user_id: string; start_time: string; end_time: string };
  type ScheduleException = { user_id: string; is_off_day: boolean; start_time: string | null; end_time: string | null };

  const templatesByUser = new Map<string, ScheduleTemplate[]>();
  for (const t of (templatesData || []) as ScheduleTemplate[]) {
    const list = templatesByUser.get(t.user_id) || [];
    list.push(t);
    templatesByUser.set(t.user_id, list);
  }
  const shiftByUser = new Map(
    ((todayShifts || []) as TodayShift[]).map((s) => [s.user_id, s])
  );
  const exceptionByUser = new Map(
    ((exceptionsData || []) as ScheduleException[]).map((e) => [e.user_id, e])
  );

  function resolveRosterStatus(userId: string): AttendanceRow['rosterStatus'] {
    const rec = attendanceByUser.get(userId);
    if (rec?.check_in_at) {
      return rec.status === 'late' ? 'late' : 'present';
    }
    if (rec?.status === 'absent') return 'absent';

    const exception = exceptionByUser.get(userId);
    if (exception?.is_off_day) return 'off';

    const shift = shiftByUser.get(userId);
    if (shift) {
      const now = new Date().toTimeString().slice(0, 8);
      if (now < shift.start_time) return 'pending';
      if (now <= shift.end_time) return 'pending';
      return 'absent';
    }

    const dayTemplate = templatesByUser.get(userId)?.find((t) => t.weekday === todayWeekday);
    if (dayTemplate?.is_off_day) return 'off';
    if (dayTemplate && !dayTemplate.is_off_day) {
      const now = new Date().toTimeString().slice(0, 8);
      const end = dayTemplate.end_time || '17:00:00';
      if (now > end) return 'absent';
      return 'pending';
    }

    return 'not_scheduled';
  }

  const attendanceRows: AttendanceRow[] = members
    .filter((m) => m.is_active && m.role !== 'clinic_admin')
    .map((m) => {
      const rec = attendanceByUser.get(m.user_id);
      return {
        userId: m.user_id,
        staffName: nameByUserId.get(m.user_id) || 'Unknown',
        role: m.role,
        status: rec?.status ?? null,
        rosterStatus: resolveRosterStatus(m.user_id),
        checkInAt: rec?.check_in_at ?? null,
        checkOutAt: rec?.check_out_at ?? null,
      };
    });

  const staffOptions = staffList
    .filter((s) => s.role !== 'clinic_admin' && s.isActive)
    .map((s) => ({ id: s.id, name: `${s.firstName} ${s.lastName}`.trim() }));

  const firstStaffId = staffOptions[0]?.id;
  const firstBranchId = branches?.[0]?.id;
  const initialTemplate: DayTemplate[] = [1, 2, 3, 4, 5, 6, 0].map((weekday) => {
    const row = (templatesData || []).find(
      (t) => t.user_id === firstStaffId && t.branch_id === firstBranchId && t.weekday === weekday
    );
    return {
      weekday,
      startTime: row?.start_time?.slice(0, 5) || '09:00',
      endTime: row?.end_time?.slice(0, 5) || '17:00',
      isOffDay: row?.is_off_day ?? weekday === 0,
    };
  });

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
            initialTemplate={initialTemplate}
            templateUserId={firstStaffId}
            templateBranchId={firstBranchId}
          />
        }
      />
    </div>
  );
}

