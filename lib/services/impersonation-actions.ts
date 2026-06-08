'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';
import { IMPERSONATION_COOKIE, clearImpersonationCookie } from '@/lib/auth/impersonation';

const StartSchema = z.object({
  organizationId: z.string().uuid(),
  reason: z.string().min(3).max(500),
});

export async function startImpersonationAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const parsed = StartSchema.parse(payload);
    const adminClient = await createAdminClient();

    await adminClient
      .from('impersonation_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('super_admin_id', session.userId)
      .eq('is_active', true);

    const { data: row, error } = await adminClient
      .from('impersonation_sessions')
      .insert({
        super_admin_id: session.userId,
        target_organization_id: parsed.organizationId,
        reason: parsed.reason,
        is_active: true,
      })
      .select('id')
      .single();

    if (error || !row) {
      return { success: false, error: error?.message || 'Failed to start impersonation' };
    }

    const cookieStore = await cookies();
    cookieStore.set(IMPERSONATION_COOKIE, parsed.organizationId, {
      path: '/',
      httpOnly: true,
      sameSite: 'lax',
      secure: process.env.NODE_ENV === 'production',
      maxAge: 60 * 60 * 4,
    });

    await writeAuditLog({
      organizationId: parsed.organizationId,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'IMPERSONATION_STARTED',
      resourceType: 'ORGANIZATION',
      resourceId: parsed.organizationId,
      afterData: { sessionId: row.id, reason: parsed.reason },
    });

    revalidatePath('/super-admin', 'layout');
    return { success: true, redirectTo: '/dashboard' };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Impersonation failed',
    };
  }
}

const ForceEndSchema = z.object({ sessionId: z.string().uuid() });

/**
 * Force-ends another super admin's active impersonation session from the
 * monitor. Audited as a security event against the target organization.
 */
export async function forceEndImpersonationAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const parsed = ForceEndSchema.parse(payload);
    const adminClient = await createAdminClient();

    const { data: row, error: fetchError } = await adminClient
      .from('impersonation_sessions')
      .select('id, target_organization_id, super_admin_id, is_active')
      .eq('id', parsed.sessionId)
      .maybeSingle();

    if (fetchError || !row) {
      return { success: false, error: fetchError?.message || 'Session not found' };
    }

    const { error } = await adminClient
      .from('impersonation_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('id', parsed.sessionId);

    if (error) {
      return { success: false, error: error.message };
    }

    await writeAuditLog({
      organizationId: row.target_organization_id,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'IMPERSONATION_FORCE_ENDED',
      resourceType: 'ORGANIZATION',
      resourceId: row.target_organization_id,
      category: 'security',
      severity: 'warning',
      afterData: { sessionId: row.id, endedBy: session.userId, originalActor: row.super_admin_id },
    });

    revalidatePath('/super-admin', 'layout');
    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to end session',
    };
  }
}

export async function endImpersonationAction() {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const cookieStore = await cookies();
    const orgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;

    const adminClient = await createAdminClient();
    await adminClient
      .from('impersonation_sessions')
      .update({ is_active: false, ended_at: new Date().toISOString() })
      .eq('super_admin_id', session.userId)
      .eq('is_active', true);

    if (orgId) {
      await writeAuditLog({
        organizationId: orgId,
        branchId: null,
        actorUserId: session.userId,
        actorRole: 'super_admin',
        action: 'IMPERSONATION_ENDED',
        resourceType: 'ORGANIZATION',
        resourceId: orgId,
        afterData: {},
      });
    }

    await clearImpersonationCookie();
    revalidatePath('/dashboard', 'layout');
    revalidatePath('/super-admin', 'layout');
    return { success: true, redirectTo: '/super-admin/dashboard' };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to end impersonation',
    };
  }
}
