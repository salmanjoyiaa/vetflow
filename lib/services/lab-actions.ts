'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { LabOrderSchema, LabResultSchema } from '@/lib/validations/schemas';

/**
 * Creates a lab order against a visit. Scoped to the caller's organization and
 * the visit's branch. Doctors and clinic admins may order labs.
 */
export async function createLabOrderAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const parsed = LabOrderSchema.parse(payload);
    const supabase = await createClient();

    // Resolve and authorize the visit within the caller's organization.
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('id, organization_id, branch_id, patient_id')
      .eq('id', parsed.visitId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (visitError || !visit) {
      throw new Error('Visit record not found or access denied.');
    }

    const { data: order, error: orderError } = await supabase
      .from('lab_orders')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: visit.branch_id,
        visit_id: visit.id,
        patient_id: visit.patient_id,
        lab_test_id: parsed.labTestId || null,
        test_name: parsed.testName,
        result_text: parsed.notes || null,
        status: 'ordered',
        ordered_by: ctx.userId,
      })
      .select()
      .single();

    if (orderError || !order) {
      throw new Error(orderError?.message || 'Failed to create lab order.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'LAB_ORDER_CREATED',
      resourceType: 'LAB_ORDER',
      resourceId: order.id,
      afterData: { test_name: order.test_name, visit_id: visit.id },
    });

    return { success: true, labOrder: order };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

/**
 * Updates a lab order's status/result text and optional result document link.
 */
export async function updateLabOrderResultAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const parsed = LabResultSchema.parse(payload);
    const supabase = await createClient();

    const { data: existing, error: existingError } = await supabase
      .from('lab_orders')
      .select('id, organization_id, branch_id, status')
      .eq('id', parsed.labOrderId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (existingError || !existing) {
      throw new Error('Lab order not found or access denied.');
    }

    const { data: updated, error: updateError } = await supabase
      .from('lab_orders')
      .update({
        status: parsed.status,
        result_text: parsed.resultText || null,
        result_document_id: parsed.resultDocumentId || null,
      })
      .eq('id', existing.id)
      .select()
      .single();

    if (updateError) {
      throw new Error(updateError.message || 'Failed to update lab order.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: existing.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'LAB_ORDER_UPDATED',
      resourceType: 'LAB_ORDER',
      resourceId: existing.id,
      beforeData: { status: existing.status },
      afterData: { status: parsed.status },
    });

    return { success: true, labOrder: updated };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}
