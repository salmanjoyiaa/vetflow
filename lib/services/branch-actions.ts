'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { BranchSchema, type BranchInput } from '@/lib/validations/schemas';

/**
 * Creates a new branch for the organization.
 */
export async function createBranchAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_branches');

    const parsed = BranchSchema.parse(payload);
    const supabase = await createClient();

    const { data: branch, error } = await supabase
      .from('branches')
      .insert({
        organization_id: ctx.organizationId,
        name: parsed.name,
        address: parsed.address,
        phone: parsed.phone,
        email: parsed.email || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !branch) {
      throw new Error(error?.message || 'Failed to create branch.');
    }

    // Record audit trail
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: branch.id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'BRANCH_CREATED',
      resourceType: 'BRANCH',
      resourceId: branch.id,
      afterData: branch,
    });

    return { success: true, branch };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Toggles a branch active status.
 */
export async function toggleBranchStatusAction(branchId: string, isActive: boolean) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_branches');

    const supabase = await createClient();

    const { data: branch, error } = await supabase
      .from('branches')
      .update({ is_active: isActive })
      .eq('id', branchId)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single();

    if (error || !branch) {
      throw new Error(error?.message || 'Failed to update branch status.');
    }

    // Record audit trail
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: branch.id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'BRANCH_UPDATED',
      resourceType: 'BRANCH',
      resourceId: branch.id,
      afterData: { is_active: isActive },
    });

    return { success: true, branch };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
