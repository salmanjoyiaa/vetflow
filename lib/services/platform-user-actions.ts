'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

const CreateSuperAdminSchema = z.object({
  email: z.string().email(),
  password: z.string().min(8, { message: 'Password must be at least 8 characters' }),
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
});

/**
 * Creates a new platform super admin via the Supabase Admin API.
 * Restricted to existing super admins; every creation is audited.
 */
export async function createSuperAdminAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized: Restricted to platform super admins.' };
    }

    const parsed = CreateSuperAdminSchema.parse(payload);
    const adminClient = await createAdminClient();

    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        is_super_admin: true,
      },
    });
    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create super admin.' };
    }

    // Ensure the profile flag is set even if the auth trigger raced.
    await adminClient
      .from('user_profiles')
      .upsert(
        {
          id: authData.user.id,
          first_name: parsed.firstName,
          last_name: parsed.lastName,
          is_super_admin: true,
        },
        { onConflict: 'id' }
      );

    await writeAuditLog({
      organizationId: null,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'SUPERADMIN_CREATED',
      resourceType: 'USER',
      resourceId: authData.user.id,
      category: 'security',
      severity: 'critical',
      afterData: { email: parsed.email, name: `${parsed.firstName} ${parsed.lastName}` },
    });

    return { success: true, userId: authData.user.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

const SetStatusSchema = z.object({
  userId: z.string().uuid(),
  enable: z.boolean(),
});

/**
 * Grants or revokes platform super admin status. A super admin cannot revoke
 * their own access (prevents lockout). Audited as a critical security event.
 */
export async function setSuperAdminStatusAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized: Restricted to platform super admins.' };
    }

    const parsed = SetStatusSchema.parse(payload);

    if (parsed.userId === session.userId && !parsed.enable) {
      return { success: false, error: 'You cannot revoke your own super admin access.' };
    }

    const adminClient = await createAdminClient();
    const { error } = await adminClient
      .from('user_profiles')
      .update({ is_super_admin: parsed.enable })
      .eq('id', parsed.userId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog({
      organizationId: null,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: parsed.enable ? 'SUPERADMIN_GRANTED' : 'SUPERADMIN_REVOKED',
      resourceType: 'USER',
      resourceId: parsed.userId,
      category: 'security',
      severity: 'critical',
      afterData: { is_super_admin: parsed.enable },
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}
