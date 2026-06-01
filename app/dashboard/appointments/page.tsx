import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import AppointmentsListClient from '@/components/dashboard/AppointmentsListClient';
import { Calendar, Link as LinkIcon, ExternalLink } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Appointments Scheduler',
  description: 'Manage clinic appointments and online bookings.',
};

export default async function AppointmentsPage() {
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

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
      <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs p-6 rounded-2xl">
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
      
      {/* HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
            <Calendar className="w-5 h-5 text-primary-teal" />
            Appointments
          </h2>
          <p className="text-xs text-graphite/70 mt-1">
            Review online request entries and manage clinic schedules.
          </p>
        </div>

        {/* Public Booking Link Badge */}
        {org && (
          <div className="bg-white border border-border/40 p-3 rounded-2xl flex items-center gap-3 shadow-sm text-xs font-semibold text-primary-navy">
            <LinkIcon className="w-4 h-4 text-primary-teal" />
            <div>
              <span className="text-[9px] text-graphite/40 block uppercase">Client Booking Link</span>
              <a 
                href={publicBookingUrl} 
                target="_blank" 
                rel="noopener noreferrer" 
                className="text-primary-teal hover:underline inline-flex items-center gap-1 font-bold"
              >
                /book/{org.slug}
                <ExternalLink className="w-3 h-3" />
              </a>
            </div>
          </div>
        )}
      </div>

      {/* APPOINTMENTS LIST */}
      <AppointmentsListClient 
        initialAppointments={appointments || []} 
        doctors={doctors}
      />

    </div>
  );
}
