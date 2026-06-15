import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { getDoctorPatientMedicalHistoryAction } from '@/lib/services/patient-medical-actions';
import DoctorPatientHistoryClient from '@/components/doctors/DoctorPatientHistoryClient';
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

  const result = await getDoctorPatientMedicalHistoryAction(petId);

  if (!result.success) {
    const isAccessDenied = result.error?.includes('assigned to you');
    return (
      <div
        className={
          isAccessDenied
            ? 'bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl'
            : 'bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl'
        }
      >
        {result.error}
      </div>
    );
  }

  const { data } = result;

  return (
    <div className="space-y-6">
      <PageHeader
        title={`Medical history: ${data.petName}`}
        description="Review all visits, clinical notes, and medical files. Upload or remove documents."
        icon={Heart}
      />
      <DoctorPatientHistoryClient
        petId={data.petId}
        petName={data.petName}
        species={data.species}
        breed={data.breed}
        allergies={data.allergies}
        ownerName={data.ownerName}
        visits={data.visits}
        variant="page"
        editable={ctx.role === 'doctor' || ctx.role === 'clinic_admin'}
      />
    </div>
  );
}
