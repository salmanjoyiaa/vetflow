import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import InvoiceCheckoutClient from '@/components/forms/InvoiceCheckoutClient';
import Link from 'next/link';
import { ArrowLeft, Receipt } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Patient Checkout',
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

  // 1. Fetch visit details
  const { data: visit, error: visitError } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      branch_id,
      pet_id,
      pets ( id, name, species, breed ),
      customers ( first_name, last_name, phone )
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

  if (visit.status !== 'ready_for_checkout') {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        Patient visit state is not ready for billing. Attend the consultation room first.
      </div>
    );
  }

  // 2. Load linked Prescription and items
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('id, prescription_items(*)')
    .eq('visit_id', visit.id)
    .eq('is_finalized', true)
    .maybeSingle();

  const presItems = prescription?.prescription_items as any[] || [];

  // 3. Compile base billing items (General Consultation)
  // Look up consultation service price in catalog or fallback to $50.00
  const { data: consultProduct } = await supabase
    .from('products')
    .select('id, name, selling_price, type')
    .eq('organization_id', session.organizationId)
    .eq('branch_id', visit.branch_id)
    .eq('sku', 'SVC-CONSULT')
    .maybeSingle();

  const billingItems: {
    name: string;
    quantity: number;
    unitPrice: number;
    type: string;
  }[] = [
    {
      name: consultProduct?.name || 'General Consultation Service',
      quantity: 1,
      unitPrice: consultProduct ? Number(consultProduct.selling_price) : 50.00,
      type: 'service',
    },
  ];

  // 4. Join prescription items (catalog lookup pricing)
  for (const item of presItems) {
    if (item.product_id) {
      const { data: prod } = await supabase
        .from('products')
        .select('name, selling_price, type')
        .eq('id', item.product_id)
        .single();
      
      if (prod) {
        billingItems.push({
          name: prod.name,
          quantity: item.quantity_requested,
          unitPrice: Number(prod.selling_price),
          type: prod.type,
        });
      }
    } else {
      // Free text item
      billingItems.push({
        name: item.medicine_name,
        quantity: item.quantity_requested,
        unitPrice: 10.00, // custom items default flat fee
        type: 'medicine',
      });
    }
  }

  // 5. Retrieve active branch/org tax configurations
  const { data: taxSetting } = await supabase
    .from('tax_settings')
    .select('is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services')
    .eq('organization_id', session.organizationId)
    .maybeSingle();

  const petDetails = visit.pets as any;
  const customerDetails = visit.customers as any;

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div className="space-y-2">
        <Link 
          href="/dashboard/walk-ins" 
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Walk-in Queue
        </Link>
        <div>
          <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary" />
            Patient Checkout & Discharge
          </h2>
          <p className="text-xs text-on-surface-variant/70 mt-1">
            Review billing ledger items and finalize transaction payments.
          </p>
        </div>
      </div>

      {/* CHECKOUT INTERFACE */}
      <InvoiceCheckoutClient
        visitId={visit.id}
        pet={{
          name: petDetails.name,
          species: petDetails.species,
          breed: petDetails.breed,
        }}
        customer={{
          firstName: customerDetails.first_name,
          lastName: customerDetails.last_name,
          phone: customerDetails.phone,
        }}
        items={billingItems}
        taxPercentage={taxSetting?.is_enabled ? Number(taxSetting.tax_percentage) : 0}
        taxName={taxSetting?.tax_name || 'VAT'}
        appliesToProducts={taxSetting?.applies_to_products || false}
        appliesToServices={taxSetting?.applies_to_services || false}
      />

    </div>
  );
}
