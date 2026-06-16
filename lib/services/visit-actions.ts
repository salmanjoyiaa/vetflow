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

async function assertAssignedDoctorVisit(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  organizationId: string,
  doctorId: string
) {
  const { data: visit, error } = await supabase
    .from('visits')
    .select(`
      id,
      status,
      branch_id,
      consult_paused_at,
      consult_pause_accumulated_sec,
      visit_assignments!inner ( doctor_id )
    `)
    .eq('id', visitId)
    .eq('organization_id', organizationId)
    .eq('visit_assignments.doctor_id', doctorId)
    .single();

  if (error || !visit) {
    throw new Error('Visit not found or you are not the assigned doctor.');
  }
  if (visit.status !== 'consulting') {
    throw new Error('Only active consultations can be paused or resumed.');
  }
  return visit;
}

/**
 * Pauses an in-progress consultation (timer frozen, visit stays assigned).
 */
export async function pauseConsultationAction(visitId: string, reason: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const trimmed = reason?.trim();
    if (!trimmed || trimmed.length < 3) {
      throw new Error('Please provide a pause reason (at least 3 characters).');
    }

    const supabase = await createClient();
    const visit = await assertAssignedDoctorVisit(
      supabase,
      visitId,
      ctx.organizationId!,
      ctx.userId
    );

    if (visit.consult_paused_at) {
      throw new Error('Consultation is already paused.');
    }

    const pausedAt = new Date().toISOString();
    const { error } = await supabase
      .from('visits')
      .update({
        consult_paused_at: pausedAt,
        consult_pause_reason: trimmed,
      })
      .eq('id', visitId);

    if (error) {
      throw new Error(error.message || 'Failed to pause consultation.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'CONSULT_PAUSED',
      resourceType: 'VISIT',
      resourceId: visitId,
      afterData: { reason: trimmed, paused_at: pausedAt },
    });

    return { success: true as const };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false as const, error: message };
  }
}

/**
 * Resumes a paused consultation and accumulates paused duration for the timer.
 */
export async function resumeConsultationAction(visitId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const supabase = await createClient();
    const visit = await assertAssignedDoctorVisit(
      supabase,
      visitId,
      ctx.organizationId!,
      ctx.userId
    );

    if (!visit.consult_paused_at) {
      throw new Error('Consultation is not paused.');
    }

    const pausedMs =
      Date.now() - new Date(visit.consult_paused_at as string).getTime();
    const addedSec = Math.max(0, Math.floor(pausedMs / 1000));
    const accumulated =
      (visit.consult_pause_accumulated_sec as number) + addedSec;

    const { error } = await supabase
      .from('visits')
      .update({
        consult_paused_at: null,
        consult_pause_reason: null,
        consult_pause_accumulated_sec: accumulated,
      })
      .eq('id', visitId);

    if (error) {
      throw new Error(error.message || 'Failed to resume consultation.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'CONSULT_RESUMED',
      resourceType: 'VISIT',
      resourceId: visitId,
      afterData: { accumulated_pause_sec: accumulated },
    });

    return { success: true as const };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false as const, error: message };
  }
}
