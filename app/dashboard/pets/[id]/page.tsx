import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { getPatientMedicalProfileAction } from '@/lib/services/patient-medical-actions';
import PetMedicalProfileClient from '@/components/pets/PetMedicalProfileClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { Heart } from 'lucide-react';

export const metadata = {
  title: 'Patient Medical File',
  description: 'Review patient bios, clinical notes, and prescriptions.',
};

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: petId } = await params;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/pets');
  if (denied) return denied;

  const result = await getPatientMedicalProfileAction(petId);

  if (!result.success) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        {result.error || 'Patient profile not found or access denied.'}
      </div>
    );
  }

  const canEdit = ctx.role === 'doctor' || ctx.role === 'clinic_admin';
  const canPhoto =
    ctx.role === 'doctor' || ctx.role === 'receptionist' || ctx.role === 'clinic_admin';

  return (
    <div className="space-y-8">
      <PageHeader
        title={`Medical File: ${result.data.petName}`}
        description="Clinical charting history and diagnostics for this patient."
        icon={Heart}
      />
      <PetMedicalProfileClient
        profile={result.data}
        variant="page"
        editable={canEdit}
        canUploadPhoto={canPhoto}
        canEditCareNotes={canPhoto}
        userRole={ctx.role}
      />
    </div>
  );
}
