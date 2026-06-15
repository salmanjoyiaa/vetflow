import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/premium/PageHeader';
import PetsListClient from '@/components/dashboard/PetsListClient';
import { Heart } from 'lucide-react';

export const metadata = {
  title: 'Patient Registry',
  description: 'Manage registered pets and review active patient cases.',
};

export default async function PetsPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/pets');
  if (denied) return denied;

  const session = ctx;

  const supabase = await createClient();
  const { data: pets, error } = await supabase
    .from('patients')
    .select(`
      id,
      name,
      species,
      breed,
      gender,
      date_of_birth,
      weight_kg,
      customer_id,
      allergies,
      medical_notes,
      customers (
        first_name,
        last_name
      )
    `)
    .eq('organization_id', session.organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load pet profiles: {error.message}
      </div>
    );
  }

  const rows = (pets || []).map((pet) => {
    const owner = pet.customers as { first_name: string; last_name: string } | null;
    return {
      id: pet.id,
      name: pet.name,
      species: pet.species,
      breed: pet.breed,
      gender: pet.gender,
      date_of_birth: pet.date_of_birth,
      weight_kg: pet.weight_kg,
      customer_id: pet.customer_id,
      allergies: pet.allergies,
      medical_notes: pet.medical_notes,
      ownerFirstName: owner?.first_name ?? null,
      ownerLastName: owner?.last_name ?? null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Patient Registry"
        description="Review and inspect registered animals across the organization."
        icon={Heart}
      />

      {rows.length > 0 ? (
        <PetsListClient pets={rows} isAdmin={session.role === 'clinic_admin'} />
      ) : (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center">
          <Heart className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-on-surface mb-1">No Registered Patients</h4>
          <p className="text-xs text-on-surface-variant/60">
            To register a pet, open a customer profile and click the Register Pet button.
          </p>
        </div>
      )}
    </div>
  );
}
