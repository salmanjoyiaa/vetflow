'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import {
  assertBranchAccess,
  assertCapability,
  assertFeature,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import {
  CheckoutSchema,
  UpdateInvoicePaymentSchema,
  type CheckoutInput,
} from '@/lib/validations/schemas';
import { sendEmail, compileInvoiceDeliveryTemplate } from '@/lib/email';

/**
 * Executes checkout transaction on the server.
 * Loads visit, finds linked prescription, compiles billing items (consultation service + medicines),
 * retrieves active organization tax rules, computes final totals, registers invoice and payment records,
 * performs atomic stock deductions for physical items, and marks visit completed.
 */
export async function createInvoiceFromVisitAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'billing_checkout');
    assertFeature(ctx, 'sales');

    const parsed = CheckoutSchema.parse(payload);

    const adminClient = await createAdminClient();

    const { data: visit, error: visitErr } = await adminClient
      .from('visits')
      .select('*, pets(*), customers(*)')
      .eq('id', parsed.visitId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (visitErr || !visit || visit.status !== 'ready_for_checkout') {
      throw new Error('Visit record is not ready for checkout or access denied.');
    }

    assertBranchAccess(ctx, visit.branch_id);

    // 2. Load linked Prescription and items
    const { data: prescription } = await adminClient
      .from('prescriptions')
      .select('id, prescription_items(*)')
      .eq('visit_id', visit.id)
      .eq('is_finalized', true)
      .maybeSingle();

    const presItems = prescription?.prescription_items as any[] || [];

    // 3. Compile Billing items list
    // A. Add Consultation Service base fee by looking up SVC-CONSULT or defaulting to $50.00 base fee
    const { data: consultProduct } = await adminClient
      .from('products')
      .select('id, name, selling_price, type')
      .eq('organization_id', ctx.organizationId)
      .eq('branch_id', visit.branch_id)
      .eq('sku', 'SVC-CONSULT')
      .maybeSingle();

    const billingItems: {
      productId: string | null;
      name: string;
      quantity: number;
      unitPrice: number;
      type: string;
    }[] = [
      {
        productId: consultProduct?.id || null,
        name: consultProduct?.name || 'General Consultation Service',
        quantity: 1,
        unitPrice: consultProduct ? Number(consultProduct.selling_price) : 50.00,
        type: 'service',
      },
    ];

    // B. Add Medicine products from prescription (must look up catalog pricing to prevent client tempering)
    for (const item of presItems) {
      if (item.product_id) {
        const { data: prod } = await adminClient
          .from('products')
          .select('id, name, selling_price, type')
          .eq('id', item.product_id)
          .single();
        
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
        // Free-text medicine item (no product ID link, default unit price to 0 or manual check - let's default to $10.00 for custom items)
        billingItems.push({
          productId: null,
          name: item.medicine_name,
          quantity: item.quantity_requested,
          unitPrice: 10.00,
          type: 'medicine',
        });
      }
    }

    // 4. Retrieve Organization Tax settings
    const { data: taxSetting } = await adminClient
      .from('tax_settings')
      .select('is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services')
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();

    const taxEnabled = taxSetting?.is_enabled || false;
    const taxPercentage = taxEnabled ? Number(taxSetting?.tax_percentage || 0) : 0;

    // 5. Calculate Subtotals and Taxes
    let subtotal = 0;
    let taxAmountTotal = 0;

    const invoiceItemInserts = billingItems.map((item) => {
      const itemSub = item.quantity * item.unitPrice;
      subtotal += itemSub;

      // Determine if tax applies to this product type
      let applies = false;
      if (taxEnabled) {
        if (item.type === 'service' && taxSetting?.applies_to_services) applies = true;
        if (item.type !== 'service' && taxSetting?.applies_to_products) applies = true;
      }

      const itemTax = applies ? (itemSub * (taxPercentage / 100)) : 0;
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

    const discount = parsed.discount;
    // Enforce total calculations
    const totalBeforeDiscount = subtotal + taxAmountTotal;
    const total = Math.max(0, totalBeforeDiscount - discount);

    // 6. Create Invoice Row
    const invoiceNumber = `INV-${Date.now()}`;
    const isPaid = parsed.paymentStatus === 'paid';

    const { data: invoice, error: invoiceErr } = await adminClient
      .from('invoices')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: visit.branch_id,
        invoice_number: invoiceNumber,
        customer_id: visit.customer_id,
        pet_id: visit.pet_id,
        visit_id: visit.id,
        subtotal,
        discount,
        tax_percentage: taxPercentage,
        tax_amount: taxAmountTotal,
        total,
        payment_status: isPaid ? 'paid' : 'unpaid',
        notes: parsed.notes || null,
        created_by: ctx.userId,
        paid_at: isPaid ? new Date().toISOString() : null,
      })
      .select()
      .single();

    if (invoiceErr || !invoice) {
      throw new Error(invoiceErr?.message || 'Failed to generate billing invoice.');
    }

    // 7. Create Invoice Items rows
    const itemInserts = invoiceItemInserts.map((item) => ({
      invoice_id: invoice.id,
      ...item,
    }));

    const { error: itemsErr } = await adminClient.from('invoice_items').insert(itemInserts);
    if (itemsErr) {
      // Revert invoice creation
      await adminClient.from('invoices').delete().eq('id', invoice.id);
      throw new Error(itemsErr.message || 'Failed to save invoice billing items.');
    }

    // 8. Register Payment record when paid at checkout
    if (isPaid) {
      const { error: payErr } = await adminClient
        .from('payments')
        .insert({
          organization_id: ctx.organizationId,
          branch_id: visit.branch_id,
          invoice_id: invoice.id,
          amount: total,
          payment_method: parsed.paymentMethod,
          reference_number: parsed.paymentReference || null,
          created_by: ctx.userId,
        });

      if (payErr) {
        await adminClient.from('invoices').delete().eq('id', invoice.id);
        throw new Error(payErr.message || 'Failed to register payment transaction.');
      }
    }

    // 9. Deduct stock levels for physical items and register stock movements
    for (const item of billingItems) {
      if (item.productId && item.type !== 'service') {
        // Query product current stock
        const { data: prod } = await adminClient
          .from('products')
          .select('stock_quantity')
          .eq('id', item.productId)
          .single();

        if (prod) {
          const newQty = Math.max(0, prod.stock_quantity - item.quantity);
          await adminClient
            .from('products')
            .update({ stock_quantity: newQty })
            .eq('id', item.productId);

          // Log stock movement
          await adminClient.from('stock_movements').insert({
            organization_id: ctx.organizationId,
            branch_id: visit.branch_id,
            product_id: item.productId,
            type: 'invoice_sale',
            quantity: -item.quantity, // Negative count represents stock reduction
            reason: `Invoice sale checkout ${invoiceNumber}`,
            created_by: ctx.userId,
          });
        }
      }
    }

    // 10. Close Visit state
    const { error: visitCloseErr } = await adminClient
      .from('visits')
      .update({
        status: 'completed',
        completed_at: new Date().toISOString(),
      })
      .eq('id', visit.id);

    if (visitCloseErr) {
      console.error('Failed to close visit state:', visitCloseErr);
    }

    if (visit.appointment_id) {
      await adminClient
        .from('appointments')
        .update({ status: 'completed' })
        .eq('id', visit.appointment_id)
        .eq('organization_id', ctx.organizationId);
    }

    // 11. Write Audit Log
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'INVOICE_CREATED',
      resourceType: 'INVOICE',
      resourceId: invoice.id,
      afterData: invoice,
    });

    if (isPaid) {
      await writeAuditLog({
        organizationId: ctx.organizationId,
        branchId: visit.branch_id,
        actorUserId: ctx.userId,
        actorRole: ctx.role || 'receptionist',
        action: 'PAYMENT_RECEIVED',
        resourceType: 'PAYMENT',
        resourceId: invoice.id,
        afterData: { total, paymentMethod: parsed.paymentMethod },
      });
    }

    const { data: clinicalNote } = await adminClient
      .from('clinical_notes')
      .select('id')
      .eq('visit_id', visit.id)
      .maybeSingle();

    if (parsed.sendEmailReceipt) {
      const customer = visit.customers as { email?: string | null } | null;
      if (customer?.email) {
        await sendEmail({
          to: customer.email,
          subject: `Invoice ${invoiceNumber} — ${ctx.organizationName || 'ClinixDev'}`,
          html: compileInvoiceDeliveryTemplate(
            ctx.organizationName || 'ClinixDev',
            invoiceNumber,
            total.toFixed(2)
          ),
        });
      }
    }

    return {
      success: true,
      invoiceId: invoice.id,
      prescriptionId: prescription?.id || null,
      clinicalNotesId: clinicalNote?.id || null,
    };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred during checkout.' };
  }
}

export async function updateInvoicePaymentStatusAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'billing_checkout');
    assertFeature(ctx, 'sales');

    const parsed = UpdateInvoicePaymentSchema.parse(payload);
    const adminClient = await createAdminClient();

    const { data: invoice, error: invErr } = await adminClient
      .from('invoices')
      .select('*')
      .eq('id', parsed.invoiceId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (invErr || !invoice) {
      throw new Error('Invoice not found or access denied.');
    }

    assertBranchAccess(ctx, invoice.branch_id);

    if (invoice.payment_status === 'paid') {
      throw new Error('Invoice is already marked as paid.');
    }

    const total = Number(invoice.total);

    const { error: payErr } = await adminClient.from('payments').insert({
      organization_id: ctx.organizationId,
      branch_id: invoice.branch_id,
      invoice_id: invoice.id,
      amount: total,
      payment_method: parsed.paymentMethod,
      reference_number: parsed.paymentReference || null,
      created_by: ctx.userId,
    });

    if (payErr) {
      throw new Error(payErr.message || 'Failed to register payment.');
    }

    const { error: updateErr } = await adminClient
      .from('invoices')
      .update({
        payment_status: 'paid',
        paid_at: new Date().toISOString(),
      })
      .eq('id', invoice.id);

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update invoice status.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: invoice.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'PAYMENT_RECEIVED',
      resourceType: 'INVOICE',
      resourceId: invoice.id,
      afterData: { total, paymentMethod: parsed.paymentMethod },
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update payment status.',
    };
  }
}

export async function resendInvoiceEmailAction(invoiceId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'billing_checkout');

    const adminClient = await createAdminClient();
    const { data: invoice, error } = await adminClient
      .from('invoices')
      .select('invoice_number, total, branch_id, customers ( email )')
      .eq('id', invoiceId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (error || !invoice) {
      throw new Error('Invoice not found.');
    }

    assertBranchAccess(ctx, invoice.branch_id);

    const customer = invoice.customers as { email?: string | null } | null;
    if (!customer?.email) {
      throw new Error('Customer has no email on file.');
    }

    const emailRes = await sendEmail({
      to: customer.email,
      subject: `Invoice ${invoice.invoice_number} — ${ctx.organizationName || 'ClinixDev'}`,
      html: compileInvoiceDeliveryTemplate(
        ctx.organizationName || 'ClinixDev',
        invoice.invoice_number,
        Number(invoice.total).toFixed(2)
      ),
    });

    if (!emailRes.success) {
      throw new Error(emailRes.error || 'Failed to send email.');
    }

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to resend email.',
    };
  }
}
