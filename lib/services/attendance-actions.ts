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

function nowTimeHms(): string {
  return new Date().toTimeString().slice(0, 8);
}

const WeekdayTemplateSchema = z.object({
  weekday: z.number().int().min(0).max(6),
  startTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  endTime: z.string().regex(/^\d{2}:\d{2}$/).optional(),
  isOffDay: z.boolean(),
});

const SaveScheduleTemplateSchema = z.object({
  userId: z.string().uuid(),
  branchId: z.string().uuid(),
  days: z.array(WeekdayTemplateSchema).length(7),
});

const BulkAssignScheduleSchema = z.object({
  userIds: z.array(z.string().uuid()).min(1),
  branchId: z.string().uuid(),
  days: z.array(WeekdayTemplateSchema).length(7),
});

const GenerateShiftsSchema = z.object({
  weeksAhead: z.number().int().min(1).max(8).default(2),
});

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

    const { data: shift } = await adminClient
      .from('shifts')
      .select('id, start_time')
      .eq('organization_id', ctx.organizationId)
      .eq('user_id', ctx.userId)
      .eq('shift_date', work_date)
      .order('start_time', { ascending: true })
      .limit(1)
      .maybeSingle();

    let status = 'present';
    if (shift?.start_time && nowTimeHms() > shift.start_time) {
      status = 'late';
    }

    const { error } = await adminClient.from('attendance_records').insert({
      organization_id: ctx.organizationId,
      branch_id: branchId,
      user_id: ctx.userId,
      shift_id: shift?.id ?? null,
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

/**
 * Saves (upserts) a staff member's weekly schedule template.
 */
export async function saveScheduleTemplateAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_attendance');

    const parsed = SaveScheduleTemplateSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const adminClient = await createAdminClient();
    const rows = parsed.days.map((day) => ({
      organization_id: ctx.organizationId,
      branch_id: parsed.branchId,
      user_id: parsed.userId,
      weekday: day.weekday,
      start_time: day.isOffDay ? null : day.startTime,
      end_time: day.isOffDay ? null : day.endTime,
      is_off_day: day.isOffDay,
      created_by: ctx.userId,
    }));

    const { error } = await adminClient
      .from('staff_schedule_templates')
      .upsert(rows, { onConflict: 'organization_id,user_id,branch_id,weekday' });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/staff');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to save schedule template.',
    };
  }
}

/**
 * Applies the same weekly pattern to multiple staff members.
 */
export async function bulkAssignScheduleTemplateAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_attendance');

    const parsed = BulkAssignScheduleSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const adminClient = await createAdminClient();
    const rows = parsed.userIds.flatMap((userId) =>
      parsed.days.map((day) => ({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        user_id: userId,
        weekday: day.weekday,
        start_time: day.isOffDay ? null : day.startTime,
        end_time: day.isOffDay ? null : day.endTime,
        is_off_day: day.isOffDay,
        created_by: ctx.userId,
      }))
    );

    const { error } = await adminClient
      .from('staff_schedule_templates')
      .upsert(rows, { onConflict: 'organization_id,user_id,branch_id,weekday' });

    if (error) throw new Error(error.message);

    revalidatePath('/dashboard/staff');
    return { success: true, count: parsed.userIds.length };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to bulk-assign schedule.',
    };
  }
}

/**
 * Materializes shift rows from weekly templates for the next N weeks.
 */
export async function generateShiftsFromTemplatesAction(payload: unknown = {}) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_attendance');

    const { weeksAhead } = GenerateShiftsSchema.parse(payload);
    const adminClient = await createAdminClient();

    const { data: templates, error: tplError } = await adminClient
      .from('staff_schedule_templates')
      .select('user_id, branch_id, weekday, start_time, end_time, is_off_day')
      .eq('organization_id', ctx.organizationId)
      .eq('is_off_day', false);

    if (tplError) throw new Error(tplError.message);
    if (!templates?.length) {
      return { success: true, created: 0 };
    }

    const start = new Date();
    start.setHours(0, 0, 0, 0);
    let created = 0;

    for (let d = 0; d < weeksAhead * 7; d++) {
      const day = new Date(start);
      day.setDate(start.getDate() + d);
      const shiftDate = day.toISOString().slice(0, 10);
      const weekday = day.getDay();

      const dayTemplates = templates.filter((t) => t.weekday === weekday);
      for (const tpl of dayTemplates) {
        const { data: existing } = await adminClient
          .from('shifts')
          .select('id')
          .eq('organization_id', ctx.organizationId)
          .eq('user_id', tpl.user_id)
          .eq('branch_id', tpl.branch_id)
          .eq('shift_date', shiftDate)
          .maybeSingle();

        if (existing) continue;

        const { error: insError } = await adminClient.from('shifts').insert({
          organization_id: ctx.organizationId,
          branch_id: tpl.branch_id,
          user_id: tpl.user_id,
          shift_date: shiftDate,
          start_time: tpl.start_time,
          end_time: tpl.end_time,
          created_by: ctx.userId,
        });

        if (!insError) created++;
      }
    }

    revalidatePath('/dashboard/staff');
    return { success: true, created };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate shifts.',
    };
  }
}

/**
 * Marks scheduled staff as absent when their shift has ended with no check-in.
 * Safe to call on staff page load (idempotent).
 */
export async function syncDailyAttendanceAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized: Session is invalid.');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_attendance');

    const adminClient = await createAdminClient();
    const work_date = todayIso();
    const nowTime = nowTimeHms();

    const { data: shifts, error: shiftError } = await adminClient
      .from('shifts')
      .select('id, user_id, branch_id, end_time')
      .eq('organization_id', ctx.organizationId)
      .eq('shift_date', work_date);

    if (shiftError) throw new Error(shiftError.message);
    if (!shifts?.length) return { success: true, marked: 0 };

    let marked = 0;
    for (const shift of shifts) {
      if (!shift.end_time || nowTime <= shift.end_time) continue;

      const { data: existing } = await adminClient
        .from('attendance_records')
        .select('id, check_in_at')
        .eq('organization_id', ctx.organizationId)
        .eq('user_id', shift.user_id)
        .eq('work_date', work_date)
        .maybeSingle();

      if (existing?.check_in_at) continue;

      if (existing) {
        const { error } = await adminClient
          .from('attendance_records')
          .update({ status: 'absent', shift_id: shift.id })
          .eq('id', existing.id);
        if (!error) marked++;
      } else {
        const { error } = await adminClient.from('attendance_records').insert({
          organization_id: ctx.organizationId,
          branch_id: shift.branch_id,
          user_id: shift.user_id,
          shift_id: shift.id,
          work_date,
          status: 'absent',
        });
        if (!error) marked++;
      }
    }

    revalidatePath('/dashboard/staff');
    return { success: true, marked };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to sync attendance.',
    };
  }
}
