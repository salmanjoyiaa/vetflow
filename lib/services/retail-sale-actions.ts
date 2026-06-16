'use server';

import { createAdminClient } from '@/lib/supabase/server';
import {
  assertBranchAccess,
  assertCapability,
  assertFeature,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { RetailSaleSchema } from '@/lib/validations/schemas';
import {
  computeInvoiceLines,
  deductStockForProductLines,
  loadOrgTaxSettings,
  type InvoiceLineInput,
} from '@/lib/billing/create-invoice-core';
import {
  sendEmail,
  compileInvoiceDeliveryTemplate,
  compileThankYouTemplate,
} from '@/lib/email';
import { formatMoney } from '@/lib/utils/currency';
import { normalizePhoneInput } from '@/lib/reception/phone';

async function resolveOrCreateCustomer(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  ctx: NonNullable<Awaited<ReturnType<typeof resolveServerAuthContext>>>,
  branchId: string,
  data: {
    customerId?: string;
    firstName: string;
    lastName: string;
    phone: string;
    email?: string;
  }
): Promise<{ id: string; email: string | null }> {
  if (data.customerId) {
    const { data: existing } = await adminClient
      .from('customers')
      .select('id, email')
      .eq('id', data.customerId)
      .eq('organization_id', ctx.organizationId!)
      .eq('branch_id', branchId)
      .is('deleted_at', null)
      .maybeSingle();
    if (existing) return { id: existing.id, email: existing.email };
  }

  const normalized = normalizePhoneInput(data.phone);
  const { data: byPhone } = await adminClient
    .from('customers')
    .select('id, email')
    .eq('organization_id', ctx.organizationId!)
    .eq('branch_id', branchId)
    .is('deleted_at', null)
    .or(`phone.eq.${data.phone},phone.ilike.%${normalized}%`)
    .maybeSingle();

  if (byPhone) return { id: byPhone.id, email: byPhone.email };

  const { data: created, error } = await adminClient
    .from('customers')
    .insert({
      organization_id: ctx.organizationId,
      branch_id: branchId,
      first_name: data.firstName.trim(),
      last_name: data.lastName.trim(),
      phone: data.phone.trim(),
      email: data.email?.trim() || null,
      created_by: ctx.userId,
    })
    .select('id, email')
    .single();

  if (error || !created) {
    throw new Error(error?.message || 'Failed to create customer record.');
  }

  await writeAuditLog({
    organizationId: ctx.organizationId!,
    branchId,
    actorUserId: ctx.userId,
    actorRole: ctx.role || 'receptionist',
    action: 'CUSTOMER_CREATED',
    resourceType: 'CUSTOMER',
    resourceId: created.id,
    afterData: { source: 'retail_sale' },
  });

  return { id: created.id, email: created.email };
}

async function validateStock(
  adminClient: Awaited<ReturnType<typeof createAdminClient>>,
  items: InvoiceLineInput[]
): Promise<void> {
  for (const item of items) {
    if (!item.productId || item.lineType !== 'product') continue;
    const { data: prod } = await adminClient
      .from('products')
      .select('name, stock_quantity, is_active')
      .eq('id', item.productId)
      .single();

    if (!prod || !prod.is_active) {
      throw new Error(`Product "${item.name}" is not available.`);
    }
    if (Number(prod.stock_quantity) < item.quantity) {
      throw new Error(
        `Insufficient stock for "${prod.name}" (have ${prod.stock_quantity}, need ${item.quantity}).`
      );
    }
  }
}

export async function createRetailSaleAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'billing_checkout');
    assertFeature(ctx, 'sales');

    const parsed = RetailSaleSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const adminClient = await createAdminClient();

    const invoiceLines: InvoiceLineInput[] = parsed.lineItems.map((line) => ({
      productId: line.lineType === 'product' ? line.productId ?? null : null,
      name: line.name,
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      lineType: line.lineType,
    }));

    await validateStock(adminClient, invoiceLines);

    const customer = await resolveOrCreateCustomer(adminClient, ctx, parsed.branchId, {
      customerId: parsed.customerId,
      firstName: parsed.customerFirstName,
      lastName: parsed.customerLastName,
      phone: parsed.customerPhone,
      email: parsed.customerEmail,
    });

    const tax = await loadOrgTaxSettings(adminClient, ctx.organizationId!);
    const { lines, subtotal, taxAmountTotal } = computeInvoiceLines(invoiceLines, tax);
    const discount = parsed.discount ?? 0;
    const total = Math.max(0, subtotal + taxAmountTotal - discount);
    const invoiceNumber = `INV-${Date.now()}`;

    const { data: invoice, error: invoiceErr } = await adminClient
      .from('invoices')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        invoice_number: invoiceNumber,
        customer_id: customer.id,
        patient_id: null,
        visit_id: null,
        sale_type: 'retail',
        subtotal,
        discount,
        tax_percentage: tax.taxPercentage,
        tax_amount: taxAmountTotal,
        total,
        payment_status: 'paid',
        notes: parsed.notes || null,
        created_by: ctx.userId,
        paid_at: new Date().toISOString(),
      })
      .select()
      .single();

    if (invoiceErr || !invoice) {
      throw new Error(invoiceErr?.message || 'Failed to create retail sale invoice.');
    }

    const { error: itemsErr } = await adminClient.from('invoice_items').insert(
      lines.map((line) => ({ invoice_id: invoice.id, ...line }))
    );

    if (itemsErr) {
      await adminClient.from('invoices').delete().eq('id', invoice.id);
      throw new Error(itemsErr.message || 'Failed to save invoice line items.');
    }

    const { error: payErr } = await adminClient.from('payments').insert({
      organization_id: ctx.organizationId,
      branch_id: parsed.branchId,
      invoice_id: invoice.id,
      amount: total,
      payment_method: parsed.paymentMethod,
      reference_number: parsed.paymentReference || null,
      created_by: ctx.userId,
    });

    if (payErr) {
      await adminClient.from('invoices').delete().eq('id', invoice.id);
      throw new Error(payErr.message || 'Failed to register payment.');
    }

    await deductStockForProductLines(adminClient, {
      organizationId: ctx.organizationId!,
      branchId: parsed.branchId,
      userId: ctx.userId,
      invoiceNumber,
      items: invoiceLines,
    });

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'RETAIL_SALE_CREATED',
      resourceType: 'INVOICE',
      resourceId: invoice.id,
      afterData: { total, sale_type: 'retail', itemCount: lines.length },
    });

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'PAYMENT_RECEIVED',
      resourceType: 'PAYMENT',
      resourceId: invoice.id,
      afterData: { total, paymentMethod: parsed.paymentMethod },
    });

    if (parsed.sendEmailReceipt && customer.email) {
      await sendEmail({
        to: customer.email,
        subject: `Invoice ${invoiceNumber} — ${ctx.organizationName || 'ClinixDev'}`,
        html: compileInvoiceDeliveryTemplate(
          ctx.organizationName || 'ClinixDev',
          invoiceNumber,
          formatMoney(total, ctx.currency)
        ),
      });
      await sendEmail({
        to: customer.email,
        subject: `Thank you for your purchase — ${ctx.organizationName || 'ClinixDev'}`,
        html: compileThankYouTemplate(
          ctx.organizationName || 'ClinixDev',
          invoiceNumber,
          formatMoney(total, ctx.currency),
          `${parsed.customerFirstName} ${parsed.customerLastName}`.trim()
        ),
      });
    }

    return { success: true as const, invoiceId: invoice.id, invoiceNumber, total };
  } catch (err: unknown) {
    return {
      success: false as const,
      error: err instanceof Error ? err.message : 'Failed to complete retail sale.',
    };
  }
}
