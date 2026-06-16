import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/premium/PageHeader';
import ScheduleDayCalendarClient from '@/components/schedule/ScheduleDayCalendarClient';
import { resolveDateFromParam } from '@/lib/utils/date-filters';
import { Calendar } from 'lucide-react';

export const metadata = {
  title: 'Schedule',
  description: 'Multi-provider day calendar for clinic appointments.',
};

export default async function SchedulePage({
  searchParams,
}: {
  searchParams: Promise<{ date?: string }>;
}) {
  const { date: dateParam } = await searchParams;
  const selectedDate = resolveDateFromParam(dateParam);

  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/schedule');
  if (denied) return denied;

  const cookieStore = await cookies();
  let activeBranchId = cookieStore.get('clinix_branch_id')?.value;
  if (!activeBranchId && ctx.branches.length > 0) {
    activeBranchId = ctx.branches[0].id;
  } else if (activeBranchId && !ctx.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = ctx.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to view the schedule.
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: doctorsData }, { data: appointmentsRaw }] = await Promise.all([
    supabase
      .from('organization_members')
      .select('user_id, user_profiles ( first_name, last_name )')
      .eq('organization_id', ctx.organizationId)
      .eq('role', 'doctor')
      .eq('is_active', true),
    supabase
      .from('appointments')
      .select(
        'id, patient_name, customer_name, reason, status, preferred_date, preferred_time, doctor_id, is_emergency, duration_minutes'
      )
      .eq('branch_id', activeBranchId)
      .eq('preferred_date', selectedDate)
      .in('status', ['requested', 'confirmed', 'rescheduled', 'checked_in'])
      .order('preferred_time', { ascending: true }),
  ]);

  const doctors =
    doctorsData
      ?.filter((d) => d.user_profiles)
      .map((d) => {
        const p = d.user_profiles as { first_name: string; last_name: string };
        return {
          id: d.user_id,
          firstName: p.first_name || '',
          lastName: p.last_name || '',
        };
      }) || [];

  const appointments = (appointmentsRaw || []).map((a) => ({
    id: a.id,
    patientName: a.patient_name,
    customerName: a.customer_name,
    reason: a.reason,
    status: a.status,
    preferredDate: a.preferred_date as string,
    preferredTime: (a.preferred_time as string).slice(0, 8),
    durationMinutes: (a.duration_minutes as number) ?? 30,
    doctorId: a.doctor_id as string | null,
    isEmergency: a.is_emergency ?? false,
  }));

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clinic schedule"
        description="Day view by provider — click a slot to book or an appointment for details."
        icon={Calendar}
      />
      <ScheduleDayCalendarClient
        doctors={doctors}
        appointments={appointments}
        selectedDate={selectedDate}
        currentUserId={ctx.userId}
        currentRole={ctx.role}
        activeBranchId={activeBranchId}
      />
    </div>
  );
}
