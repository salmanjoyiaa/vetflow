'use server';

import { createAdminClient } from '@/lib/supabase/server';
import {
  assertBranchAccess,
  assertCapability,
  assertClinicAdmin,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { PrescriptionEditSchema } from '@/lib/validations/schemas';

export async function getPrescriptionForEditAction(prescriptionId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertClinicAdmin(ctx);
    assertCapability(ctx, 'manage_prescriptions');

    const admin = await createAdminClient();
    const { data: rx, error } = await admin
      .from('prescriptions')
      .select(`
        id,
        notes,
        revision_number,
        branch_id,
        visit_id,
        prescription_items (
          id,
          medicine_name,
          dosage,
          frequency,
          duration,
          instructions,
          quantity_requested
        )
      `)
      .eq('id', prescriptionId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (error || !rx) {
      throw new Error('Prescription not found or access denied.');
    }

    assertBranchAccess(ctx, rx.branch_id);

    return {
      success: true,
      prescription: {
        id: rx.id,
        notes: rx.notes || '',
        revisionNumber: rx.revision_number,
        items: (rx.prescription_items || []).map(
          (item: {
            medicine_name: string;
            dosage: string;
            frequency: string;
            duration: string;
            instructions: string | null;
            quantity_requested: number;
          }) => ({
            medicineName: item.medicine_name,
            dosage: item.dosage,
            frequency: item.frequency,
            duration: item.duration,
            instructions: item.instructions || '',
            quantityRequested: item.quantity_requested,
          })
        ),
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load prescription.',
    };
  }
}

export async function updatePrescriptionAction(prescriptionId: string, payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertClinicAdmin(ctx);
    assertCapability(ctx, 'manage_prescriptions');

    const parsed = PrescriptionEditSchema.parse(payload);
    const admin = await createAdminClient();

    const { data: existing, error: fetchErr } = await admin
      .from('prescriptions')
      .select(`
        *,
        prescription_items ( * )
      `)
      .eq('id', prescriptionId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Prescription not found or access denied.');
    }

    assertBranchAccess(ctx, existing.branch_id);

    const nextRevision = (existing.revision_number || 1) + 1;

    const { error: revisionErr } = await admin.from('prescription_revisions').insert({
      prescription_id: prescriptionId,
      revision_number: existing.revision_number,
      changed_by: ctx.userId,
      old_data: {
        notes: existing.notes,
        items: existing.prescription_items,
      },
    });

    if (revisionErr) {
      throw new Error(revisionErr.message || 'Failed to save revision history.');
    }

    const { error: updateErr } = await admin
      .from('prescriptions')
      .update({
        notes: parsed.notes || null,
        revision_number: nextRevision,
      })
      .eq('id', prescriptionId);

    if (updateErr) {
      throw new Error(updateErr.message || 'Failed to update prescription.');
    }

    const { error: deleteItemsErr } = await admin
      .from('prescription_items')
      .delete()
      .eq('prescription_id', prescriptionId);

    if (deleteItemsErr) {
      throw new Error(deleteItemsErr.message || 'Failed to update prescription items.');
    }

    const itemRows = parsed.items.map((item) => ({
      prescription_id: prescriptionId,
      medicine_name: item.medicineName,
      dosage: item.dosage,
      frequency: item.frequency,
      duration: item.duration,
      instructions: item.instructions || null,
      quantity_requested: item.quantityRequested,
    }));

    const { error: insertItemsErr } = await admin.from('prescription_items').insert(itemRows);

    if (insertItemsErr) {
      throw new Error(insertItemsErr.message || 'Failed to save prescription items.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: existing.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'PRESCRIPTION_UPDATED',
      resourceType: 'PRESCRIPTION',
      resourceId: prescriptionId,
      afterData: { revisionNumber: nextRevision, itemCount: parsed.items.length },
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to update prescription.',
    };
  }
}

export async function deletePrescriptionAction(prescriptionId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertClinicAdmin(ctx);
    assertCapability(ctx, 'manage_prescriptions');

    const admin = await createAdminClient();

    const { data: existing, error: fetchErr } = await admin
      .from('prescriptions')
      .select(`
        *,
        prescription_items ( * )
      `)
      .eq('id', prescriptionId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Prescription not found or access denied.');
    }

    assertBranchAccess(ctx, existing.branch_id);

    const { data: paidInvoice } = await admin
      .from('invoices')
      .select('id')
      .eq('visit_id', existing.visit_id)
      .eq('organization_id', ctx.organizationId)
      .eq('payment_status', 'paid')
      .limit(1)
      .maybeSingle();

    if (paidInvoice) {
      throw new Error('Cannot delete prescription linked to a visit with a paid invoice.');
    }

    const { error: deleteErr } = await admin
      .from('prescriptions')
      .delete()
      .eq('id', prescriptionId);

    if (deleteErr) {
      throw new Error(deleteErr.message || 'Failed to delete prescription.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: existing.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'PRESCRIPTION_DELETED',
      resourceType: 'PRESCRIPTION',
      resourceId: prescriptionId,
      severity: 'warning',
      beforeData: existing,
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to delete prescription.',
    };
  }
}
