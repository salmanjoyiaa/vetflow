import type { SupabaseClient } from '@supabase/supabase-js';

export type BillingLineItem = {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  type: string;
};

type PrescriptionItem = {
  product_id: string | null;
  medicine_name: string;
  quantity_requested: number;
};

type VisitService = {
  name: string;
  unit_price: number;
  quantity: number;
};

export async function compileVisitBillingItems(
  supabase: SupabaseClient,
  opts: {
    organizationId: string;
    branchId: string;
    visitId: string;
    prescriptionItems: PrescriptionItem[];
  }
): Promise<BillingLineItem[]> {
  const { data: visitServices } = await supabase
    .from('visit_services')
    .select('name, unit_price, quantity')
    .eq('visit_id', opts.visitId);

  const billingItems: BillingLineItem[] = [];

  if (visitServices && visitServices.length > 0) {
    for (const svc of visitServices as VisitService[]) {
      billingItems.push({
        productId: null,
        name: svc.name,
        quantity: svc.quantity,
        unitPrice: Number(svc.unit_price),
        type: 'service',
      });
    }
  } else {
    const { data: consultProduct } = await supabase
      .from('products')
      .select('id, name, selling_price, type')
      .eq('organization_id', opts.organizationId)
      .eq('branch_id', opts.branchId)
      .eq('sku', 'SVC-CONSULT')
      .maybeSingle();

    billingItems.push({
      productId: consultProduct?.id || null,
      name: consultProduct?.name || 'General Consultation Service',
      quantity: 1,
      unitPrice: consultProduct ? Number(consultProduct.selling_price) : 50,
      type: 'service',
    });
  }

  const productIds = opts.prescriptionItems
    .map((item) => item.product_id)
    .filter((id): id is string => Boolean(id));

  const productMap = new Map<string, { id: string; name: string; selling_price: number; type: string }>();
  if (productIds.length > 0) {
    const { data: products } = await supabase
      .from('products')
      .select('id, name, selling_price, type')
      .in('id', productIds);
    for (const p of products || []) {
      productMap.set(p.id, p);
    }
  }

  for (const item of opts.prescriptionItems) {
    if (item.product_id) {
      const prod = productMap.get(item.product_id);
      if (prod) {
        billingItems.push({
          productId: prod.id,
          name: prod.name,
          quantity: item.quantity_requested,
          unitPrice: Number(prod.selling_price),
          type: prod.type,
        });
      }
    } else {
      billingItems.push({
        productId: null,
        name: item.medicine_name,
        quantity: item.quantity_requested,
        unitPrice: 10,
        type: 'medicine',
      });
    }
  }

  return billingItems;
}
