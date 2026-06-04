'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { CompleteConsultationSchema } from '@/lib/validations/schemas';

/**
 * Saves clinical notes, creates and finalizes the prescription, and sets the visit 
 * state to 'ready_for_checkout' (or 'completed' if no items are billed).
 */
export async function completeConsultationAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const parsed = CompleteConsultationSchema.parse(payload);
    const supabase = await createClient();

    // 1. Retrieve the Visit details to locate pet/branch/org IDs
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('*')
      .eq('id', parsed.visitId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (visitError || !visit) {
      throw new Error('Visit record not found or access denied.');
    }

    // 2. Create Clinical Notes
    const { data: notes, error: notesError } = await supabase
      .from('clinical_notes')
      .insert({
        visit_id: parsed.visitId,
        chief_complaint: parsed.chiefComplaint,
        history: parsed.history || null,
        examination_findings: parsed.examinationFindings || null,
        diagnosis: parsed.diagnosis,
        treatment_plan: parsed.treatmentPlan || null,
        internal_notes: parsed.internalNotes || null,
        follow_up_recommendation: parsed.followUpRecommendation || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (notesError) {
      throw new Error(notesError.message || 'Failed to save clinical notes.');
    }

    // 3. Create Prescription if items are specified
    let prescriptionId: string | null = null;
    if (parsed.prescriptionItems.length > 0) {
      const { data: prescription, error: presError } = await supabase
        .from('prescriptions')
        .insert({
          organization_id: ctx.organizationId,
          branch_id: visit.branch_id,
          visit_id: visit.id,
          pet_id: visit.pet_id,
          doctor_id: ctx.userId,
          is_finalized: true,
          revision_number: 1,
        })
        .select()
        .single();

      if (presError || !prescription) {
        throw new Error(presError?.message || 'Failed to initialize prescription.');
      }

      prescriptionId = prescription.id;

      // Create prescription items
      const itemInserts = parsed.prescriptionItems.map((item) => ({
        prescription_id: prescriptionId,
        product_id: item.productId || null,
        medicine_name: item.medicineName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions || null,
        quantity_requested: item.quantityRequested,
      }));

      const { error: itemsError } = await supabase
        .from('prescription_items')
        .insert(itemInserts);

      if (itemsError) {
        // Clean up prescription shell on failure
        await supabase.from('prescriptions').delete().eq('id', prescriptionId);
        throw new Error(itemsError.message || 'Failed to add prescription items.');
      }

      // Record prescription creation in audit logs
      await writeAuditLog({
        organizationId: ctx.organizationId,
        branchId: visit.branch_id,
        actorUserId: ctx.userId,
        actorRole: ctx.role || 'doctor',
        action: 'PRESCRIPTION_CREATED',
        resourceType: 'PRESCRIPTION',
        resourceId: prescriptionId || undefined,
        afterData: prescription,
      });
    }

    // 4. Update Visit status (defaulting to checkout if billing is needed)
    // In V1, we route all complete consultations to 'ready_for_checkout' for billing reviews
    const { error: visitUpdateError } = await supabase
      .from('visits')
      .update({
        status: 'ready_for_checkout',
        completed_at: new Date().toISOString(),
      })
      .eq('id', visit.id);

    if (visitUpdateError) {
      throw new Error(visitUpdateError.message || 'Failed to update visit status.');
    }

    // Record audit trail
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'VISIT_CREATED', // Marks the visit phase transition
      resourceType: 'VISIT',
      resourceId: visit.id,
      afterData: { status: 'ready_for_checkout' },
    });

    return { success: true, visitId: visit.id, prescriptionId };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
