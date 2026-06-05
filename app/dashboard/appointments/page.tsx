import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import AppointmentsListClient from '@/components/dashboard/AppointmentsListClient';
import AppointmentsPageHeader from '@/components/dashboard/AppointmentsPageHeader';
import { Suspense } from 'react';

export const metadata = {
  title: 'VetFlow Appointments Scheduler',
  description: 'Manage clinic appointments and online bookings.',
};

export default async function AppointmentsPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    redirect('/login');
  }

  const denied = guardRoute(ctx, '/dashboard/appointments');
  if (denied) return denied;

  const session = ctx;

  // 1. Resolve branch context
  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('vetflow_branch_id')?.value;
  let activeBranchId = activeBranchCookie;

  if (!activeBranchId && session.branches.length > 0) {
    activeBranchId = session.branches[0].id;
  } else if (activeBranchId && !session.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = session.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to open the appointments dashboard.
      </div>
    );
  }

  const supabase = await createClient();

  // 2. Fetch appointments in active branch
  const { data: appointments, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('branch_id', activeBranchId)
    .order('preferred_date', { ascending: true })
    .order('preferred_time', { ascending: true });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load appointments: {error.message}
      </div>
    );
  }

  // 3. Fetch doctors in organization (for checkout room check-ins)
  const { data: doctorsData } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      user_profiles ( first_name, last_name )
    `)
    .eq('organization_id', session.organizationId)
    .eq('role', 'doctor')
    .eq('is_active', true);

  const doctors = doctorsData?.map((d) => ({
    id: d.user_id,
    firstName: (d.user_profiles as any).first_name || '',
    lastName: (d.user_profiles as any).last_name || '',
  })) || [];

  // 4. Resolve slug and public booking URL
  // Fetch organization slug
  const { data: org } = await supabase
    .from('organizations')
    .select('slug')
    .eq('id', session.organizationId)
    .single();

  const publicBookingUrl = org ? `/book/${org.slug}` : '#';

  return (
    <div className="space-y-8">
      
      <Suspense fallback={null}>
        <AppointmentsPageHeader
          orgSlug={org?.slug}
          publicBookingUrl={publicBookingUrl}
          doctors={doctors}
          activeBranchId={activeBranchId}
        />
      </Suspense>

      {/* APPOINTMENTS LIST */}
      <AppointmentsListClient 
        initialAppointments={appointments || []} 
        doctors={doctors}
      />

    </div>
  );
}

