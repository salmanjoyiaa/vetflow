'use server';

import { z } from 'zod';
import { revalidatePath } from 'next/cache';
import { createAdminClient } from '@/lib/supabase/server';
import {
  assertBranchAccess,
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';

function todayIso(): string {
  return new Date().toISOString().slice(0, 10);
}

const ShiftSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid(),
  shiftDate: z.string().regex(/^\d{4}-\d{2}-\d{2}$/, 'Invalid date'),
  startTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time'),
  endTime: z.string().regex(/^\d{2}:\d{2}$/, 'Invalid time'),
  notes: z.string().max(500).optional(),
});

/**
 * Assigns a scheduled shift to a staff member. Clinic-admin only.
 */
export async function assignShiftAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_attendance');

    const parsed = ShiftSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    if (parsed.endTime <= parsed.startTime) {
      return { success: false, error: 'End time must be after start time.' };
    }

    const adminClient = await createAdminClient();
    const { data, error } = await adminClient
      .from('shifts')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        user_id: parsed.userId,
        shift_date: parsed.shiftDate,
        start_time: parsed.startTime,
        end_time: parsed.endTime,
        notes: parsed.notes || null,
        created_by: ctx.userId,
      })
      .select('id')
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'SHIFT_ASSIGNED',
      resourceType: 'SHIFT',
      resourceId: data.id,
      category: 'data',
      afterData: { userId: parsed.userId, shiftDate: parsed.shiftDate },
    });

    revalidatePath('/dashboard/staff');
    return { success: true, shiftId: data.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to assign shift.' };
  }
}

/**
 * Removes a scheduled shift. Clinic-admin only.
 */
export async function deleteShiftAction(shiftId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_attendance');

    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from('shifts')
      .delete()
      .eq('id', shiftId)
      .eq('organization_id', ctx.organizationId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: null,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'SHIFT_REMOVED',
      resourceType: 'SHIFT',
      resourceId: shiftId,
      category: 'data',
    });

    revalidatePath('/dashboard/staff');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to remove shift.' };
  }
}

/**
 * Records the current user's check-in for today. Idempotent: if a record
 * already exists for today it is returned unchanged. Marks "late" when the
 * check-in is after any scheduled shift start for the day.
 */
export async function checkInAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'mark_attendance');

    const branchId = ctx.activeBranchId || ctx.allowedBranchIds[0];
    if (!branchId) {
      return { success: false, error: 'No branch assigned to your account.' };
    }

    const adminClient = await createAdminClient();
    const work_date = todayIso();
    const now = new Date().toISOString();

    const { data: existing } = await adminClient
      .from('attendance_records')
      .select('id, check_in_at')
      .eq('organization_id', ctx.organizationId)
      .eq('user_id', ctx.userId)
      .eq('work_date', work_date)
      .maybeSingle();

    if (existing) {
      return { success: true, alreadyCheckedIn: true };
    }

    // Determine "late" against the earliest scheduled shift today, if any.
    const { data: shift } = await adminClient
      .from('shifts')
      .select('start_time')
      .eq('organization_id', ctx.organizationId)
      .eq('user_id', ctx.userId)
      .eq('shift_date', work_date)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    let status = 'present';
    if (shift?.start_time) {
      const nowTime = new Date().toTimeString().slice(0, 8);
      if (nowTime > shift.start_time) status = 'late';
    }

    const { error } = await adminClient.from('attendance_records').insert({
      organization_id: ctx.organizationId,
      branch_id: branchId,
      user_id: ctx.userId,
      work_date,
      check_in_at: now,
      status,
    });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard');
    return { success: true, status };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to check in.' };
  }
}

/**
 * Records the current user's check-out for today.
 */
export async function checkOutAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'mark_attendance');

    const adminClient = await createAdminClient();
    const work_date = todayIso();

    const { data: existing } = await adminClient
      .from('attendance_records')
      .select('id, check_out_at')
      .eq('organization_id', ctx.organizationId)
      .eq('user_id', ctx.userId)
      .eq('work_date', work_date)
      .maybeSingle();

    if (!existing) {
      return { success: false, error: 'You have not checked in today.' };
    }
    if (existing.check_out_at) {
      return { success: true, alreadyCheckedOut: true };
    }

    const { error } = await adminClient
      .from('attendance_records')
      .update({ check_out_at: new Date().toISOString() })
      .eq('id', existing.id);

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard');
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to check out.' };
  }
}
