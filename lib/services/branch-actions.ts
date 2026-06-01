'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const BranchSchema = z.object({
  name: z.string().min(1, { message: 'Branch name is required' }),
  address: z.string().min(1, { message: 'Branch address is required' }),
  phone: z.string().min(5, { message: 'Branch phone number is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
});

export type BranchInput = z.infer<typeof BranchSchema>;

/**
 * Creates a new branch for the organization.
 */
export async function createBranchAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || session.role !== 'clinic_admin' || !session.organizationId) {
      throw new Error('Unauthorized: Only clinic administrators can create branches.');
    }

    const parsed = BranchSchema.parse(payload);
    const supabase = await createClient();

    const { data: branch, error } = await supabase
      .from('branches')
      .insert({
        organization_id: session.organizationId,
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
      organizationId: session.organizationId,
      branchId: branch.id,
      actorUserId: session.userId,
      actorRole: session.role || 'clinic_admin',
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
    const session = await resolveServerSession();
    if (!session || session.role !== 'clinic_admin' || !session.organizationId) {
      throw new Error('Unauthorized: Only clinic administrators can toggle branch state.');
    }

    const supabase = await createClient();

    const { data: branch, error } = await supabase
      .from('branches')
      .update({ is_active: isActive })
      .eq('id', branchId)
      .eq('organization_id', session.organizationId)
      .select()
      .single();

    if (error || !branch) {
      throw new Error(error?.message || 'Failed to update branch status.');
    }

    // Record audit trail
    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: branch.id,
      actorUserId: session.userId,
      actorRole: session.role || 'clinic_admin',
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
