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
      pet_id:patient_id,
      is_emergency,
      triage_notes,
      pets:patients (
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
    .eq('patient_id', visit.pet_id)
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

  // 5. Lab test catalog (org-scoped), existing lab orders, and documents for this visit
  const [{ data: labCatalogData }, { data: labOrdersData }, { data: documentsData }] =
    await Promise.all([
      supabase
        .from('lab_tests')
        .select('id, name')
        .eq('organization_id', session.organizationId)
        .eq('is_active', true)
        .order('name'),
      supabase
        .from('lab_orders')
        .select('id, test_name, status, result_text, result_document_id, created_at')
        .eq('visit_id', visitId)
        .order('created_at', { ascending: false }),
      supabase
        .from('documents')
        .select('id, file_name, category, mime_type, size_bytes, created_at')
        .eq('visit_id', visitId)
        .is('deleted_at', null)
        .order('created_at', { ascending: false }),
    ]);

  const labCatalog = (labCatalogData || []).map((t) => ({ id: t.id, name: t.name }));
  const labOrders = (labOrdersData || []).map((o) => ({
    id: o.id,
    testName: o.test_name,
    status: o.status as string,
    resultText: o.result_text as string | null,
    resultDocumentId: o.result_document_id as string | null,
    createdAt: o.created_at as string,
  }));
  const documents = (documentsData || []).map((d) => ({
    id: d.id,
    fileName: d.file_name,
    category: d.category as string,
    mimeType: d.mime_type as string | null,
    sizeBytes: d.size_bytes as number | null,
    createdAt: d.created_at as string,
  }));

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
        patientId={visit.pet_id as string}
        labCatalog={labCatalog}
        labOrders={labOrders}
        documents={documents}
      />

    </div>
  );
}
