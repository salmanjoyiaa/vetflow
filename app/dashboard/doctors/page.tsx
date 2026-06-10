import { redirect } from 'next/navigation';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { isConsultTrackingEnabled } from '@/lib/auth/features';
import DeniedState from '@/components/ui/premium/DeniedState';
import { createClient } from '@/lib/supabase/server';
import DoctorQueueClient from '@/components/dashboard/DoctorQueueClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { BriefcaseMedical } from 'lucide-react';

export const metadata = {
  title: 'Consultations',
  description: 'Clinical consultation workspace and patient queue.',
};

export default async function DoctorDashboardPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    redirect('/login');
  }

  try {
    assertCapability(ctx, 'clinical_queue');
  } catch {
    return (
      <DeniedState
        title="Clinical workspace restricted"
        message="Only doctors and clinic administrators can access the clinical queue."
      />
    );
  }

  const session = ctx;
  const supabase = await createClient();

  const { data: sub } = await supabase
    .from('subscription_status')
    .select('features')
    .eq('organization_id', session.organizationId)
    .maybeSingle();

  const showConsultTimer = isConsultTrackingEnabled(
    (sub?.features as Record<string, unknown>) || null
  );

  const { data: visitsData, error } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      checked_in_at,
      consult_started_at,
      is_emergency,
      triage_notes,
      pets:patients ( id, name, species, breed, gender ),
      customers ( first_name, last_name, phone ),
      visit_assignments!inner ( doctor_id )
    `)
    .eq('visit_assignments.doctor_id', session.userId)
    .in('status', ['waiting', 'consulting'])
    .order('is_emergency', { ascending: false })
    .order('checked_in_at', { ascending: true });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load assigned patient queue: {error.message}
      </div>
    );
  }

  const visits = visitsData?.map((v) => ({
    id: v.id,
    reason: v.reason,
    status: v.status,
    checkedInAt: v.checked_in_at,
    consultStartedAt: v.consult_started_at as string | null,
    isEmergency: v.is_emergency ?? false,
    triageNotes: v.triage_notes as string | null,
    pet: {
      id: (v.pets as { id: string; name: string; species: string; breed: string | null; gender: string }).id,
      name: (v.pets as { name: string }).name,
      species: (v.pets as { species: string }).species,
      breed: (v.pets as { breed: string | null }).breed,
      gender: (v.pets as { gender: string }).gender,
    },
    customer: {
      firstName: (v.customers as { first_name: string }).first_name,
      lastName: (v.customers as { last_name: string }).last_name,
      phone: (v.customers as { phone: string }).phone,
    },
  })) || [];

  const waitingVisits = visits.filter((v) => v.status === 'waiting');
  const consultingVisits = visits.filter((v) => v.status === 'consulting');

  return (
    <div className="space-y-8">
      <PageHeader
        title="Consultations"
        description="Review your active consultation room and queue assignments."
        icon={BriefcaseMedical}
      />

      <DoctorQueueClient
        waitingVisits={waitingVisits}
        consultingVisits={consultingVisits}
        doctorFirstName={session.firstName || ''}
        doctorLastName={session.lastName || ''}
        showConsultTimer={showConsultTimer}
      />
    </div>
  );
}
