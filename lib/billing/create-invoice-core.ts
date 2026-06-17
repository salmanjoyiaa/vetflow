import type { createAdminClient } from '@/lib/supabase/server';

export type InvoiceLineInput = {
  productId: string | null;
  name: string;
  quantity: number;
  unitPrice: number;
  lineType: 'service' | 'product';
};

export type OrgTaxSettings = {
  taxEnabled: boolean;
  taxPercentage: number;
  appliesToProducts: boolean;
  appliesToServices: boolean;
};

export type ComputedInvoiceLine = {
  product_id: string | null;
  name: string;
  quantity: number;
  unit_price: number;
  tax_amount: number;
  total: number;
};

export async function loadOrgTaxSettings(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  organizationId: string
): Promise<OrgTaxSettings> {
  const { data: taxSetting } = await adminClient
    .from('tax_settings')
    .select('is_enabled, tax_percentage, applies_to_products, applies_to_services')
    .eq('organization_id', organizationId)
    .maybeSingle();

  const taxEnabled = taxSetting?.is_enabled || false;
  return {
    taxEnabled,
    taxPercentage: taxEnabled ? Number(taxSetting?.tax_percentage || 0) : 0,
    appliesToProducts: Boolean(taxSetting?.applies_to_products),
    appliesToServices: Boolean(taxSetting?.applies_to_services),
  };
}

export function computeInvoiceLines(
  items: InvoiceLineInput[],
  tax: OrgTaxSettings
): { lines: ComputedInvoiceLine[]; subtotal: number; taxAmountTotal: number } {
  let subtotal = 0;
  let taxAmountTotal = 0;

  const lines = items.map((item) => {
    const itemSub = item.quantity * item.unitPrice;
    subtotal += itemSub;

    let applies = false;
    if (tax.taxEnabled) {
      if (item.lineType === 'service' && tax.appliesToServices) applies = true;
      if (item.lineType === 'product' && tax.appliesToProducts) applies = true;
    }

    const itemTax = applies ? itemSub * (tax.taxPercentage / 100) : 0;
    taxAmountTotal += itemTax;

    return {
      product_id: item.productId,
      name: item.name,
      quantity: item.quantity,
      unit_price: item.unitPrice,
      tax_amount: itemTax,
      total: itemSub + itemTax,
    };
  });

  return { lines, subtotal, taxAmountTotal };
}

export async function deductStockForProductLines(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  opts: {
    organizationId: string;
    branchId: string;
    userId: string;
    invoiceNumber: string;
    items: InvoiceLineInput[];
  }
): Promise<void> {
  for (const item of opts.items) {
    if (!item.productId || item.lineType !== 'product') continue;

    const { data: prod } = await adminClient
      .from('products')
      .select('stock_quantity')
      .eq('id', item.productId)
      .single();

    if (!prod) continue;

    const newQty = Math.max(0, Number(prod.stock_quantity) - item.quantity);
    await adminClient.from('products').update({ stock_quantity: newQty }).eq('id', item.productId);

    await adminClient.from('stock_movements').insert({
      organization_id: opts.organizationId,
      branch_id: opts.branchId,
      product_id: item.productId,
      type: 'invoice_sale',
      quantity: -item.quantity,
      reason: `Retail sale ${opts.invoiceNumber}`,
      created_by: opts.userId,
    });
  }
}
