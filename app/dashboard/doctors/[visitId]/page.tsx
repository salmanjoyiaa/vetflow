import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import ConsultationWorkspaceClient from '@/components/forms/ConsultationWorkspaceClient';
import Link from 'next/link';
import { ArrowLeft, Stethoscope } from 'lucide-react';

export const metadata = {
  title: 'Consultation Room',
  description: 'Active medical charting and prescription room.',
};

export default async function ConsultationRoomPage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/doctors');
  if (denied) return denied;

  const session = ctx;

  const supabase = await createClient();

  // 1. Fetch visit details
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      branch_id,
      pet_id,
      is_emergency,
      triage_notes,
      pets (
        id,
        name,
        species,
        breed,
        gender,
        allergies,
        weight_kg
      ),
      customers (
        first_name,
        last_name,
        phone
      )
    `)
    .eq('id', visitId)
    .eq('organization_id', session.organizationId)
    .single();

  if (visitError || !visit) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Visit record not found or access denied.
      </div>
    );
  }

  // 2. Auto-advance visit from waiting to consulting on load
  if (visit.status === 'waiting') {
    await supabase
      .from('visits')
      .update({ status: 'consulting' })
      .eq('id', visitId);
    visit.status = 'consulting'; // Sync local value
  }

  // 3. Fetch pet visit history
  const { data: historyData } = await supabase
    .from('visits')
    .select(`
      id,
      checked_in_at,
      reason,
      clinical_notes ( diagnosis, treatment_plan )
    `)
    .eq('pet_id', visit.pet_id)
    .eq('status', 'ready_for_checkout') // Or 'completed'
    .order('checked_in_at', { ascending: false });

  const history = historyData?.map((h) => ({
    id: h.id,
    checkedInAt: h.checked_in_at,
    reason: h.reason,
    clinicalNotes: h.clinical_notes?.[0]
      ? {
          diagnosis: h.clinical_notes[0].diagnosis,
          treatmentPlan: h.clinical_notes[0].treatment_plan,
        }
      : null,
  })) || [];

  // 4. Fetch branch catalog products (medicines & food)
  const { data: productsData } = await supabase
    .from('products')
    .select('id, name, type, selling_price')
    .eq('organization_id', session.organizationId)
    .eq('branch_id', visit.branch_id)
    .in('type', ['medicine', 'food'])
    .eq('is_active', true);

  const products = productsData?.map((p) => ({
    id: p.id,
    name: p.name,
    type: p.type,
    sellingPrice: Number(p.selling_price),
  })) || [];

  const petDetails = visit.pets as any;
  const customerDetails = visit.customers as any;

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="space-y-2">
        <Link 
          href="/dashboard/doctors" 
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Attending Queue
        </Link>
        <div>
          <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary" />
            Active Consultation Room
          </h2>
          <p className="text-xs text-on-surface-variant/70 mt-1">
            Attending Vet workspace for patient diagnosis, notes, and prescriptions.
          </p>
        </div>
      </div>

      {/* CORE WORKSPACE */}
      <ConsultationWorkspaceClient 
        visitId={visit.id}
        pet={{
          id: petDetails.id,
          name: petDetails.name,
          species: petDetails.species,
          breed: petDetails.breed,
          gender: petDetails.gender,
          allergies: petDetails.allergies,
          weightKg: petDetails.weight_kg ? Number(petDetails.weight_kg) : null,
        }}
        customer={{
          firstName: customerDetails.first_name,
          lastName: customerDetails.last_name,
          phone: customerDetails.phone,
        }}
        history={history}
        products={products}
        visitReason={visit.reason}
        isEmergency={visit.is_emergency ?? false}
        triageNotes={visit.triage_notes as string | null}
      />

    </div>
  );
}
