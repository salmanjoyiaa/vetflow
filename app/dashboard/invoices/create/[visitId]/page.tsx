import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import InvoiceCheckoutClient from '@/components/forms/InvoiceCheckoutClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import Link from 'next/link';
import { ArrowLeft, Receipt, Stethoscope, Clock, CheckCircle2 } from 'lucide-react';
import { compileVisitBillingItems } from '@/lib/billing/compile-visit-billing';

export const metadata = {
  title: 'Patient Checkout',
  description: 'Discharge and compile billing records for patient.',
};

export default async function CreateInvoicePage({
  params,
}: {
  params: Promise<{ visitId: string }>;
}) {
  const { visitId } = await params;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/invoices');
  if (denied) return denied;

  const session = ctx;
  const supabase = await createClient();

  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      branch_id,
      pet_id:patient_id,
      pets:patients ( id, name, species, breed ),
      customers ( first_name, last_name, phone, email )
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

  if (visit.status === 'completed') {
    const { data: existingInvoice } = await supabase
      .from('invoices')
      .select('id')
      .eq('visit_id', visitId)
      .maybeSingle();
    if (existingInvoice) {
      redirect(`/dashboard/invoices/${existingInvoice.id}`);
    }
  }

  if (visit.status !== 'ready_for_checkout') {
    const { data: assignment } = await supabase
      .from('visit_assignments')
      .select('doctor_id')
      .eq('visit_id', visitId)
      .maybeSingle();

    let doctorName = 'the attending veterinarian';
    if (assignment?.doctor_id) {
      const { data: doc } = await supabase
        .from('user_profiles')
        .select('first_name, last_name')
        .eq('id', assignment.doctor_id)
        .maybeSingle();
      if (doc) {
        doctorName = `Dr. ${doc.first_name} ${doc.last_name}`;
      }
    }

    if (visit.status === 'consulting' || visit.status === 'waiting') {
      return (
        <div className="space-y-6">
          <Link
            href="/dashboard/walk-ins"
            className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary font-semibold transition-colors"
          >
            <ArrowLeft className="w-4 h-4" />
            Back to Walk-in Queue
          </Link>
          <div className="glass-panel rounded-2xl border border-blue-500/30 p-8 text-center space-y-4">
            <div className="w-14 h-14 rounded-2xl bg-blue-500/10 flex items-center justify-center mx-auto">
              <Stethoscope className="w-7 h-7 text-blue-400" />
            </div>
            <h3 className="text-lg font-bold text-on-surface">Consultation in Progress</h3>
            <p className="text-sm text-on-surface-variant max-w-md mx-auto">
              {visit.status === 'consulting'
                ? `${doctorName} is currently consulting this patient. Checkout will be available once the doctor completes the visit.`
                : `Patient is waiting in queue for ${doctorName}. Checkout opens after consultation is complete.`}
            </p>
            <div className="flex items-center justify-center gap-2 text-xs text-on-surface-variant">
              <Clock className="w-4 h-4" />
              This page refreshes automatically when the visit is ready for checkout.
            </div>
          </div>
        </div>
      );
    }

    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        Patient visit is in &quot;{visit.status}&quot; status and not ready for billing yet.
      </div>
    );
  }

  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('id, prescription_items(*)')
    .eq('visit_id', visit.id)
    .eq('is_finalized', true)
    .maybeSingle();

  const presItems = (prescription?.prescription_items as Array<{
    product_id: string | null;
    medicine_name: string;
    quantity_requested: number;
  }>) || [];

  const billingItemsRaw = await compileVisitBillingItems(supabase, {
    organizationId: session.organizationId!,
    branchId: visit.branch_id,
    visitId: visit.id,
    prescriptionItems: presItems,
  });

  const billingItems = billingItemsRaw.map(({ productId: _pid, ...rest }) => rest);

  const { data: taxSetting } = await supabase
    .from('tax_settings')
    .select('is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services')
    .eq('organization_id', session.organizationId)
    .maybeSingle();

  const petDetails = visit.pets as { name: string; species: string; breed: string | null } | null;
  const customerDetails = visit.customers as {
    first_name: string;
    last_name: string;
    phone: string;
    email: string;
  } | null;

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/walk-ins"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary font-semibold transition-colors -mb-4"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Walk-in Queue
      </Link>

      <div className="flex items-center gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
        <CheckCircle2 className="w-5 h-5 text-emerald-500" />
        <p className="text-xs text-emerald-700 font-semibold">
          Consultation complete — patient is ready for checkout and discharge.
        </p>
      </div>

      <PageHeader
        title="Patient Checkout & Discharge"
        description="Review billing ledger items and finalize transaction payments."
        icon={Receipt}
      />

      <InvoiceCheckoutClient
        visitId={visit.id}
        pet={{
          name: petDetails?.name || 'Unknown',
          species: petDetails?.species || 'N/A',
          breed: petDetails?.breed || null,
        }}
        customer={{
          firstName: customerDetails?.first_name || '',
          lastName: customerDetails?.last_name || '',
          phone: customerDetails?.phone || '',
          email: customerDetails?.email || '',
        }}
        items={billingItems}
        taxPercentage={taxSetting?.is_enabled ? Number(taxSetting.tax_percentage) : 0}
        taxName={taxSetting?.tax_name || 'VAT'}
        appliesToProducts={taxSetting?.applies_to_products || false}
        appliesToServices={taxSetting?.applies_to_services || false}
        prescriptionId={prescription?.id || null}
      />
    </div>
  );
}
