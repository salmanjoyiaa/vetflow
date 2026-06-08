'use server';

import { z } from 'zod';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';
import {
  OrganizationFeaturesSchema,
  SubscriptionSchema,
  type SubscriptionInput,
} from '@/lib/validations/schemas';
import { ALL_FEATURES, type Feature } from '@/lib/auth/features';

/**
 * Manually updates subscription parameters for a tenant clinic organization.
 * Restricted strictly to platform Super Admins.
 */
export async function updateSubscriptionAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.isSuperAdmin) {
      throw new Error('Unauthorized: Restricted to ClinixDev Platform Super Admins.');
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
      throw new Error('Unauthorized: Restricted to ClinixDev Platform Super Admins.');
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

    await writeAuditLog({
      organizationId: orgId,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: isSuspended ? 'ORG_SUSPENDED' : 'ORG_ACTIVATED',
      resourceType: 'SUBSCRIPTION',
      resourceId: orgId,
      afterData: { status: statusVal },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Updates per-clinic feature flags (subscription_status.features JSONB).
 */
export async function updateOrganizationFeaturesAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.isSuperAdmin) {
      throw new Error('Unauthorized: Restricted to ClinixDev Platform Super Admins.');
    }

    const parsed = OrganizationFeaturesSchema.parse(payload);
    const adminClient = await createAdminClient();

    const featuresJson: Record<string, boolean> = {};
    for (const feature of ALL_FEATURES) {
      featuresJson[feature] = parsed.features[feature] !== false;
    }

    const { data: sub, error } = await adminClient
      .from('subscription_status')
      .update({ features: featuresJson })
      .eq('organization_id', parsed.organizationId)
      .select()
      .single();

    if (error || !sub) {
      throw new Error(error?.message || 'Failed to update organization features.');
    }

    await writeAuditLog({
      organizationId: parsed.organizationId,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'FEATURES_UPDATED',
      resourceType: 'SUBSCRIPTION',
      resourceId: sub.id,
      afterData: { features: featuresJson },
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

const AuditLogListSchema = z.object({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
  organizationId: z.string().uuid().optional(),
  actionPrefix: z.string().max(100).optional(),
});

export type AuditLogRow = {
  id: string;
  created_at: string;
  organization_id: string | null;
  actor_role: string | null;
  action: string;
  resource_type: string;
  resource_id: string | null;
  actor_user_id: string | null;
  organizations: { name: string } | null;
};

export async function listAuditLogsAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const parsed = AuditLogListSchema.parse(payload ?? {});
    const adminClient = await createAdminClient();
    const from = (parsed.page - 1) * parsed.pageSize;
    const to = from + parsed.pageSize - 1;

    let query = adminClient
      .from('audit_logs')
      .select(
        `
        id, created_at, organization_id, actor_role, action, resource_type, resource_id, actor_user_id,
        organizations ( name )
      `,
        { count: 'exact' }
      )
      .order('created_at', { ascending: false })
      .range(from, to);

    if (parsed.organizationId) {
      query = query.eq('organization_id', parsed.organizationId);
    }
    if (parsed.actionPrefix) {
      query = query.ilike('action', `${parsed.actionPrefix}%`);
    }

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      logs: (data || []) as AuditLogRow[],
      total: count || 0,
      page: parsed.page,
      pageSize: parsed.pageSize,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load audit logs',
    };
  }
}
