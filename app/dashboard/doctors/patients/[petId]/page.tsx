import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import DoctorPatientHistoryClient, {
  type DoctorVisitRow,
} from '@/components/doctors/DoctorPatientHistoryClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { Heart } from 'lucide-react';

export const metadata = {
  title: 'Patient Medical History',
  description: 'Full clinical history and medical files for an assigned patient.',
};

export default async function DoctorPatientHistoryPage({
  params,
}: {
  params: Promise<{ petId: string }>;
}) {
  const { petId } = await params;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/doctors/patients');
  if (denied) return denied;

  const supabase = await createClient();

  const { data: pet, error: petError } = await supabase
    .from('patients')
    .select(`
      id, name, species, breed, allergies,
      customers ( first_name, last_name )
    `)
    .eq('id', petId)
    .eq('organization_id', ctx.organizationId)
    .single();

  if (petError || !pet) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Patient not found or access denied.
      </div>
    );
  }

  const { data: visitRows } = await supabase
    .from('visits')
    .select(`
      id, reason, status, checked_in_at,
      visit_assignments ( doctor_id, user_profiles ( first_name, last_name ) ),
      clinical_notes ( chief_complaint, diagnosis, treatment_plan ),
      documents ( id, file_name, category, created_at )
    `)
    .eq('patient_id', petId)
    .eq('organization_id', ctx.organizationId)
    .order('checked_in_at', { ascending: false });

  const hasAccess =
    ctx.role === 'clinic_admin' ||
    (visitRows ?? []).some((v) => {
      const assignment = (v.visit_assignments as { doctor_id?: string }[] | null)?.[0];
      return assignment?.doctor_id === ctx.userId;
    });

  if (!hasAccess && ctx.role === 'doctor') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You can only view medical history for patients assigned to you.
      </div>
    );
  }

  const visits: DoctorVisitRow[] = (visitRows ?? []).map((v) => {
    const assignment = (v.visit_assignments as Array<{
      user_profiles: { first_name: string; last_name: string } | null;
    }> | null)?.[0];
    const prof = assignment?.user_profiles;
    const notes = (v.clinical_notes as DoctorVisitRow['notes'][] | null)?.[0] ?? null;
    return {
      id: v.id,
      reason: v.reason,
      status: v.status,
      checked_in_at: v.checked_in_at,
      doctorName: prof ? `Dr. ${prof.first_name} ${prof.last_name}` : null,
      notes,
      documents: (v.documents as DoctorVisitRow['documents']) ?? [],
    };
  });

  const customer = pet.customers as { first_name: string; last_name: string } | null;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Medical history: ${pet.name}`}
        description="Review all visits, clinical notes, and medical files. Upload or remove documents."
        icon={Heart}
      />
      <DoctorPatientHistoryClient
        petId={petId}
        petName={pet.name}
        species={pet.species}
        breed={pet.breed}
        allergies={pet.allergies}
        ownerName={customer ? `${customer.first_name} ${customer.last_name}` : null}
        visits={visits}
      />
    </div>
  );
}
