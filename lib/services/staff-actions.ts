'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const StaffSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }),
  password: z.string().min(6, { message: 'Password must be at least 6 characters' }),
  phone: z.string().min(5, { message: 'Phone number is required' }),
  role: z.enum(['doctor', 'receptionist'], { message: 'Invalid role' }),
  branchIds: z.array(z.string().uuid()).min(1, { message: 'Assign at least one branch' }),
});

export type StaffInput = z.infer<typeof StaffSchema>;

/**
 * Creates a new staff member (doctor or receptionist) in the clinic organization.
 */
export async function createStaffMemberAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || session.role !== 'clinic_admin' || !session.organizationId) {
      throw new Error('Unauthorized: Only clinic administrators can add staff members.');
    }

    const parsed = StaffSchema.parse(payload);
    const adminClient = await createAdminClient();

    // 1. Create the Auth User
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true, // Auto-confirm to bypass verify hurdles in sandbox
      user_metadata: {
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        phone: parsed.phone,
        is_super_admin: false,
      },
    });

    if (authError || !authData.user) {
      throw new Error(authError?.message || 'Failed to create staff auth profile.');
    }

    const newUserId = authData.user.id;

    // 2. Associate with Organization
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: session.organizationId,
        user_id: newUserId,
        role: parsed.role,
        is_active: true,
      });

    if (memberError) {
      // Clean up user if failed to bind organization role
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(memberError.message || 'Failed to bind organization role to staff member.');
    }

    // 3. Associate with Selected Branches
    const branchInserts = parsed.branchIds.map((branchId) => ({
      branch_id: branchId,
      user_id: newUserId,
    }));

    const { error: branchMemberError } = await adminClient
      .from('branch_members')
      .insert(branchInserts);

    if (branchMemberError) {
      // Cleanup organization bindings and auth user on failure
      await adminClient.from('organization_members').delete().eq('user_id', newUserId);
      await adminClient.auth.admin.deleteUser(newUserId);
      throw new Error(branchMemberError.message || 'Failed to assign branches to staff member.');
    }

    // 4. Audit Log
    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: parsed.branchIds[0],
      actorUserId: session.userId,
      actorRole: session.role || 'clinic_admin',
      action: 'STAFF_CREATED',
      resourceType: 'USER_PROFILE',
      resourceId: newUserId,
      afterData: { email: parsed.email, role: parsed.role },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Toggles a staff member active/inactive status in the organization.
 */
export async function toggleStaffStatusAction(userId: string, isActive: boolean) {
  try {
    const session = await resolveServerSession();
    if (!session || session.role !== 'clinic_admin' || !session.organizationId) {
      throw new Error('Unauthorized: Only clinic administrators can manage staff states.');
    }

    const adminClient = await createAdminClient();

    const { error } = await adminClient
      .from('organization_members')
      .update({ is_active: isActive })
      .eq('user_id', userId)
      .eq('organization_id', session.organizationId);

    if (error) {
      throw new Error(error.message || 'Failed to toggle staff active status.');
    }

    // Record audit trail
    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: null,
      actorUserId: session.userId,
      actorRole: session.role || 'clinic_admin',
      action: isActive ? 'STAFF_ROLE_CHANGED' : 'STAFF_DISABLED',
      resourceType: 'USER_PROFILE',
      resourceId: userId,
      afterData: { is_active: isActive },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
