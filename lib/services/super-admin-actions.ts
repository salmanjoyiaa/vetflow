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
import { ProvisionClinicSchema } from '@/lib/validations/auth';
import { ALL_FEATURES, OPT_IN_FEATURES, resolveFeatures, type Feature } from '@/lib/auth/features';

/**
 * Superadmin-only provisioning of a new clinic tenant + its initial clinic admin.
 * This replaces public self-serve registration. Creates the organization,
 * subscription (with plan default features), initial branch, admin user, role
 * bindings, and default tax/app settings — all under compliance audit logging.
 */
export async function provisionClinicAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.isSuperAdmin) {
      throw new Error('Unauthorized: Restricted to ClinixDev Platform Super Admins.');
    }

    const parsed = ProvisionClinicSchema.parse(payload);
    const adminClient = await createAdminClient();

    // 1. Slug uniqueness
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', parsed.orgSlug)
      .maybeSingle();
    if (existingOrg) {
      return { success: false, error: 'This clinic web address/slug is already in use.' };
    }

    // 2. Create the admin auth user
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true,
      user_metadata: {
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        phone: parsed.phone || null,
        is_super_admin: false,
      },
    });
    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create admin account.' };
    }
    const userId = authData.user.id;

    // 3. Organization (with clinic type)
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: parsed.orgName,
        slug: parsed.orgSlug,
        clinic_type_id: parsed.clinicTypeId,
      })
      .select('id, name')
      .single();
    if (orgError || !org) {
      return { success: false, error: orgError?.message || 'Failed to create clinic organization.' };
    }
    const orgId = org.id;

    // 4. Membership (clinic_admin)
    const { error: memberError } = await adminClient.from('organization_members').insert({
      organization_id: orgId,
      user_id: userId,
      role: 'clinic_admin',
      is_active: true,
    });
    if (memberError) {
      return { success: false, error: memberError.message || 'Failed to bind organization role.' };
    }

    // 5. Subscription with plan-default features
    const { data: plan } = await adminClient
      .from('plans')
      .select('id, name, default_features')
      .eq('id', parsed.planId)
      .maybeSingle();

    const features = resolveFeatures(
      (plan?.default_features as Record<string, unknown> | null) ?? null
    ).reduce<Record<string, boolean>>((acc, f) => {
      acc[f] = true;
      return acc;
    }, {});
    // Opt-in/superadmin-gated features default OFF on provisioning.
    for (const f of OPT_IN_FEATURES) {
      features[f] = false;
    }

    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);
    const isTrial = parsed.planId === 'trial';

    const { error: subError } = await adminClient.from('subscription_status').insert({
      organization_id: orgId,
      plan_id: parsed.planId,
      plan_name: parsed.planId,
      status: isTrial ? 'trial' : 'active',
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      features,
      notes: 'Provisioned by platform super admin',
    });
    if (subError) {
      return { success: false, error: subError.message || 'Failed to initialize subscription.' };
    }

    // 6. Initial branch
    const { data: branch, error: branchError } = await adminClient
      .from('branches')
      .insert({
        organization_id: orgId,
        name: parsed.branchName,
        address: parsed.branchAddress,
        phone: parsed.branchPhone,
        email: parsed.email,
        is_active: true,
      })
      .select('id, name')
      .single();
    if (branchError || !branch) {
      return { success: false, error: branchError?.message || 'Failed to initialize clinic branch.' };
    }
    const branchId = branch.id;

    // 7. Bind admin to the branch
    const { error: branchMemberError } = await adminClient.from('branch_members').insert({
      branch_id: branchId,
      user_id: userId,
    });
    if (branchMemberError) {
      return { success: false, error: branchMemberError.message || 'Failed to assign branch.' };
    }

    // 8. Default tax + app settings
    await adminClient.from('tax_settings').insert({
      organization_id: orgId,
      is_enabled: true,
      tax_name: 'VAT',
      tax_percentage: 15.0,
      applies_to_products: true,
      applies_to_services: true,
    });
    await adminClient.from('app_settings').insert({
      organization_id: orgId,
      timezone: 'UTC',
      currency: 'USD',
    });

    // 9. Compliance audit (actor = super admin)
    await writeAuditLog({
      organizationId: orgId,
      branchId,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'CLINIC_PROVISIONED',
      resourceType: 'ORGANIZATION',
      resourceId: orgId,
      category: 'security',
      severity: 'warning',
      afterData: {
        name: parsed.orgName,
        slug: parsed.orgSlug,
        clinic_type: parsed.clinicTypeId,
        plan: parsed.planId,
        admin_email: parsed.email,
      },
    });

    return { success: true, organizationId: orgId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

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
    // Opt-in (super-admin-gated) features default OFF unless explicitly enabled.
    for (const feature of OPT_IN_FEATURES) {
      featuresJson[feature] = parsed.features[feature] === true;
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
      category: 'security',
      severity: 'warning',
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
