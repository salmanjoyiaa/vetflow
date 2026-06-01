'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const WalkInSchema = z.object({
  petId: z.string().uuid({ message: 'Select a valid pet' }),
  customerId: z.string().uuid({ message: 'Select a valid customer' }),
  doctorId: z.string().uuid({ message: 'Select a valid doctor' }),
  reason: z.string().min(1, { message: 'Reason for visit is required' }),
  branchId: z.string().uuid({ message: 'Select a valid branch' }),
});

export type WalkInInput = z.infer<typeof WalkInSchema>;

/**
 * Registers a new walk-in check-in and binds it to a doctor.
 */
export async function createWalkInVisitAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.organizationId) {
      throw new Error('Unauthorized: Session is invalid.');
    }

    const parsed = WalkInSchema.parse(payload);
    const supabase = await createClient();

    // 1. Create the Visit record
    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .insert({
        organization_id: session.organizationId,
        branch_id: parsed.branchId,
        pet_id: parsed.petId,
        customer_id: parsed.customerId,
        reason: parsed.reason,
        status: 'waiting',
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
      organizationId: session.organizationId,
      branchId: parsed.branchId,
      actorUserId: session.userId,
      actorRole: session.role || 'receptionist',
      action: 'VISIT_CREATED',
      resourceType: 'VISIT',
      resourceId: visit.id,
      afterData: visit,
    });

    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: parsed.branchId,
      actorUserId: session.userId,
      actorRole: session.role || 'receptionist',
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
    const session = await resolveServerSession();
    if (!session || !['doctor', 'clinic_admin'].includes(session.role || '')) {
      throw new Error('Unauthorized: Only doctors can start consultations.');
    }

    const supabase = await createClient();

    const { data: visit, error } = await supabase
      .from('visits')
      .update({ status: 'consulting' })
      .eq('id', visitId)
      .eq('organization_id', session.organizationId)
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
