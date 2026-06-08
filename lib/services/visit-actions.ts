'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertBranchAccess,
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { WalkInSchema } from '@/lib/validations/schemas';

/**
 * Registers a new walk-in check-in and binds it to a doctor.
 */
export async function createWalkInVisitAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_walk_ins');

    const parsed = WalkInSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const supabase = await createClient();

    // 1. Create the Visit record
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        patient_id: parsed.petId,
        customer_id: parsed.customerId,
        reason: parsed.reason,
        status: 'waiting',
        is_emergency: parsed.isEmergency ?? false,
        triage_notes: parsed.triageNotes?.trim() || null,
      })
      .select()
      .single();

    if (visitError || !visit) {
      throw new Error(visitError?.message || 'Failed to check-in walk-in patient.');
    }

    // 2. Assign the Doctor
    const { error: assignError } = await supabase
      .from('visit_assignments')
      .insert({
        visit_id: visit.id,
        doctor_id: parsed.doctorId,
      });

    if (assignError) {
      // Clean up visit if assignment fails
      await supabase.from('visits').delete().eq('id', visit.id);
      throw new Error(assignError.message || 'Failed to bind doctor assignment.');
    }

    // 3. Write Audit Logs
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'VISIT_CREATED',
      resourceType: 'VISIT',
      resourceId: visit.id,
      afterData: visit,
    });

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'DOCTOR_ASSIGNED',
      resourceType: 'VISIT',
      resourceId: visit.id,
      afterData: { doctor_id: parsed.doctorId },
    });

    return { success: true, visitId: visit.id };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Advances a visit status to 'consulting' (Invoked by doctor when opening patient).
 */
export async function startConsultationAction(visitId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertCapability(ctx, 'clinical_queue');

    const supabase = await createClient();

    const { data: visit, error } = await supabase
      .from('visits')
      .update({ status: 'consulting' })
      .eq('id', visitId)
      .eq('organization_id', ctx.organizationId!)
      .select()
      .single();

    if (error || !visit) {
      throw new Error(error?.message || 'Failed to start consultation.');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
