'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const PrescriptionItemSchema = z.object({
  productId: z.string().uuid().nullable().optional(),
  medicineName: z.string().min(1, { message: 'Medicine name is required' }),
  dosage: z.string().min(1, { message: 'Dosage is required' }),
  frequency: z.string().min(1, { message: 'Frequency is required' }),
  duration: z.string().min(1, { message: 'Duration is required' }),
  instructions: z.string().optional().or(z.literal('')),
  quantityRequested: z.number().int().positive(),
});

export const CompleteConsultationSchema = z.object({
  visitId: z.string().uuid(),
  chiefComplaint: z.string().min(1, { message: 'Chief complaint is required' }),
  history: z.string().optional().or(z.literal('')),
  examinationFindings: z.string().optional().or(z.literal('')),
  diagnosis: z.string().min(1, { message: 'Diagnosis is required' }),
  treatmentPlan: z.string().optional().or(z.literal('')),
  internalNotes: z.string().optional().or(z.literal('')),
  followUpRecommendation: z.string().optional().or(z.literal('')),
  prescriptionItems: z.array(PrescriptionItemSchema),
});

export type CompleteConsultationInput = z.infer<typeof CompleteConsultationSchema>;

/**
 * Saves clinical notes, creates and finalizes the prescription, and sets the visit 
 * state to 'ready_for_checkout' (or 'completed' if no items are billed).
 */
export async function completeConsultationAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !['doctor', 'clinic_admin'].includes(session.role || '')) {
      throw new Error('Unauthorized: Only doctors can complete consultations.');
    }

    const parsed = CompleteConsultationSchema.parse(payload);
    const supabase = await createClient();

    // 1. Retrieve the Visit details to locate pet/branch/org IDs
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('*')
      .eq('id', parsed.visitId)
      .eq('organization_id', session.organizationId)
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
        created_by: session.userId,
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
          organization_id: session.organizationId,
          branch_id: visit.branch_id,
          visit_id: visit.id,
          pet_id: visit.pet_id,
          doctor_id: session.userId,
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
        organizationId: session.organizationId,
        branchId: visit.branch_id,
        actorUserId: session.userId,
        actorRole: session.role || 'doctor',
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
      organizationId: session.organizationId,
      branchId: visit.branch_id,
      actorUserId: session.userId,
      actorRole: session.role || 'doctor',
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
