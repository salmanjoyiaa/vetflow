'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';
import { SubscriptionSchema, type SubscriptionInput } from '@/lib/validations/schemas';

/**
 * Manually updates subscription parameters for a tenant clinic organization.
 * Restricted strictly to platform Super Admins.
 */
export async function updateSubscriptionAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.isSuperAdmin) {
      throw new Error('Unauthorized: Restricted to VetFlow Platform Super Admins.');
    }

    const parsed = SubscriptionSchema.parse(payload);
    const adminClient = await createAdminClient();

    // Perform the update
    const { data: sub, error } = await adminClient
      .from('subscription_status')
      .update({
        plan_name: parsed.planName,
        status: parsed.status,
        trial_end: parsed.trialEnd,
        renewal_date: parsed.renewalDate || null,
        notes: parsed.notes || null,
      })
      .eq('organization_id', parsed.organizationId)
      .select()
      .single();

    if (error || !sub) {
      throw new Error(error?.message || 'Failed to update organization subscription.');
    }

    // Write audit log
    await writeAuditLog({
      organizationId: parsed.organizationId,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'TAX_SETTING_UPDATED', // General settings category override
      resourceType: 'SUBSCRIPTION',
      resourceId: sub.id,
      afterData: sub,
    });

    return { success: true, sub };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Suspends or activates a clinic organization (tenant account lock/unlock).
 */
export async function toggleOrganizationStateAction(orgId: string, isSuspended: boolean) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.isSuperAdmin) {
      throw new Error('Unauthorized: Restricted to VetFlow Platform Super Admins.');
    }

    const adminClient = await createAdminClient();

    // Enforce state update on subscription record
    const statusVal = isSuspended ? 'suspended' : 'active';
    const { error } = await adminClient
      .from('subscription_status')
      .update({ status: statusVal })
      .eq('organization_id', orgId);

    if (error) {
      throw new Error(error.message || 'Failed to update organization status.');
    }

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
