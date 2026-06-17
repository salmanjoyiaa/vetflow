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

    const subPayload = {
      plan_id: parsed.planId,
      plan_name: parsed.planId,
      status: isTrial ? 'trial' : 'active',
      trial_start: new Date().toISOString(),
      trial_end: trialEnd.toISOString(),
      features,
      notes: 'Provisioned by platform super admin',
    };

    const { data: existingSub } = await adminClient
      .from('subscription_status')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle();

    const { error: subError } = existingSub
      ? await adminClient
          .from('subscription_status')
          .update(subPayload)
          .eq('organization_id', orgId)
      : await adminClient.from('subscription_status').insert({
          organization_id: orgId,
          ...subPayload,
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

    // Default lab test catalog for new clinics
    const defaultLabTests = [
      { name: 'Complete Blood Count', description: 'CBC panel', price: 25.0 },
      { name: 'Skin Scrape Cytology', description: 'Dermatology cytology', price: 18.0 },
      { name: 'Urinalysis', description: 'Routine urinalysis', price: 20.0 },
    ];
    await adminClient.from('lab_tests').insert(
      defaultLabTests.map((t) => ({
        organization_id: orgId,
        name: t.name,
        description: t.description,
        price: t.price,
        is_active: true,
      }))
    );

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

    const { data: beforeSub } = await adminClient
      .from('subscription_status')
      .select()
      .eq('organization_id', parsed.organizationId)
      .maybeSingle();

    const { data: plan } = await adminClient
      .from('plans')
      .select('id, name, default_features')
      .eq('id', parsed.planName)
      .maybeSingle();

    const features = resolveFeatures(
      (plan?.default_features as Record<string, unknown> | null) ?? null
    ).reduce<Record<string, boolean>>((acc, f) => {
      acc[f] = true;
      return acc;
    }, {});
    for (const f of OPT_IN_FEATURES) {
      const prior = (beforeSub?.features as Record<string, boolean> | null)?.[f];
      features[f] = prior === true;
    }

    const trialEnd = parsed.trialEnd
      ? new Date(parsed.trialEnd).toISOString()
      : beforeSub?.trial_end ??
        new Date(Date.now() + 30 * 24 * 60 * 60 * 1000).toISOString();

    const subPayload = {
      plan_id: parsed.planName,
      plan_name: parsed.planName,
      status: parsed.status,
      trial_end: trialEnd,
      renewal_date: parsed.renewalDate ? new Date(parsed.renewalDate).toISOString() : null,
      notes: parsed.notes || null,
      features,
    };

    const { data: sub, error } = beforeSub
      ? await adminClient
          .from('subscription_status')
          .update(subPayload)
          .eq('organization_id', parsed.organizationId)
          .select()
          .single()
      : await adminClient
          .from('subscription_status')
          .insert({
            organization_id: parsed.organizationId,
            trial_start: new Date().toISOString(),
            ...subPayload,
          })
          .select()
          .single();

    if (error || !sub) {
      throw new Error(error?.message || 'Failed to update organization subscription.');
    }

    await writeAuditLog({
      organizationId: parsed.organizationId,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'SUBSCRIPTION_UPDATED',
      resourceType: 'SUBSCRIPTION',
      resourceId: sub.id,
      category: 'billing',
      severity: 'warning',
      beforeData: beforeSub ?? null,
      afterData: sub,
    });

    return { success: true, sub };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
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

    const statusVal = isSuspended ? 'suspended' : 'active';
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30);

    const { data: existing } = await adminClient
      .from('subscription_status')
      .select('id')
      .eq('organization_id', orgId)
      .maybeSingle();

    const { error } = existing
      ? await adminClient
          .from('subscription_status')
          .update({ status: statusVal })
          .eq('organization_id', orgId)
      : await adminClient.from('subscription_status').insert({
          organization_id: orgId,
          plan_id: 'starter',
          plan_name: 'starter',
          status: statusVal,
          trial_start: new Date().toISOString(),
          trial_end: trialEnd.toISOString(),
          features: {},
          notes: 'Auto-provisioned on status toggle',
        });

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

const AuditLogFiltersSchema = z.object({
  organizationId: z.string().uuid().optional().or(z.literal('')),
  actionPrefix: z.string().max(100).optional().or(z.literal('')),
  actorUserId: z.string().uuid().optional().or(z.literal('')),
  category: z.enum(['data', 'access', 'security', 'billing']).optional().or(z.literal('')),
  severity: z.enum(['info', 'warning', 'critical']).optional().or(z.literal('')),
  dateFrom: z.string().optional().or(z.literal('')),
  dateTo: z.string().optional().or(z.literal('')),
});

const AuditLogListSchema = AuditLogFiltersSchema.extend({
  page: z.number().int().min(1).default(1),
  pageSize: z.number().int().min(1).max(100).default(50),
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
  category: string | null;
  severity: string | null;
  before_data: unknown;
  after_data: unknown;
  organizations: { name: string } | null;
};

const AUDIT_SELECT = `
  id, created_at, organization_id, actor_role, action, resource_type, resource_id, actor_user_id,
  category, severity, before_data, after_data,
  organizations ( name )
`;

type AuditFilters = z.infer<typeof AuditLogFiltersSchema>;

/** Builds a [gte, lteOrNull] ISO range for inclusive date filtering. */
function auditDateBounds(f: AuditFilters): { gte: string | null; lte: string | null } {
  let lte: string | null = null;
  if (f.dateTo) {
    const end = new Date(f.dateTo);
    end.setHours(23, 59, 59, 999);
    lte = end.toISOString();
  }
  return {
    gte: f.dateFrom ? new Date(f.dateFrom).toISOString() : null,
    lte,
  };
}

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
    const bounds = auditDateBounds(parsed);

    let query = adminClient
      .from('audit_logs')
      .select(AUDIT_SELECT, { count: 'exact' })
      .order('created_at', { ascending: false })
      .range(from, to);

    if (parsed.organizationId) query = query.eq('organization_id', parsed.organizationId);
    if (parsed.actorUserId) query = query.eq('actor_user_id', parsed.actorUserId);
    if (parsed.category) query = query.eq('category', parsed.category);
    if (parsed.severity) query = query.eq('severity', parsed.severity);
    if (parsed.actionPrefix) query = query.ilike('action', `${parsed.actionPrefix}%`);
    if (bounds.gte) query = query.gte('created_at', bounds.gte);
    if (bounds.lte) query = query.lte('created_at', bounds.lte);

    const { data, error, count } = await query;

    if (error) {
      return { success: false, error: error.message };
    }

    return {
      success: true,
      logs: (data || []) as unknown as AuditLogRow[],
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

function csvCell(value: unknown): string {
  if (value === null || value === undefined) return '';
  const str = typeof value === 'object' ? JSON.stringify(value) : String(value);
  if (/[",\n]/.test(str)) {
    return `"${str.replace(/"/g, '""')}"`;
  }
  return str;
}

/**
 * Exports filtered audit logs as a CSV string (max 5000 rows). The export
 * itself is recorded in the audit trail as a security event.
 */
export async function exportAuditLogsCsvAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const filters = AuditLogFiltersSchema.parse(payload ?? {});
    const adminClient = await createAdminClient();
    const bounds = auditDateBounds(filters);

    let query = adminClient
      .from('audit_logs')
      .select(AUDIT_SELECT)
      .order('created_at', { ascending: false })
      .limit(5000);

    if (filters.organizationId) query = query.eq('organization_id', filters.organizationId);
    if (filters.actorUserId) query = query.eq('actor_user_id', filters.actorUserId);
    if (filters.category) query = query.eq('category', filters.category);
    if (filters.severity) query = query.eq('severity', filters.severity);
    if (filters.actionPrefix) query = query.ilike('action', `${filters.actionPrefix}%`);
    if (bounds.gte) query = query.gte('created_at', bounds.gte);
    if (bounds.lte) query = query.lte('created_at', bounds.lte);

    const { data, error } = await query;
    if (error) {
      return { success: false, error: error.message };
    }

    const rows = (data || []) as unknown as AuditLogRow[];
    const header = [
      'created_at',
      'organization',
      'organization_id',
      'actor_user_id',
      'actor_role',
      'action',
      'category',
      'severity',
      'resource_type',
      'resource_id',
      'before_data',
      'after_data',
    ];
    const lines = [header.join(',')];
    for (const r of rows) {
      lines.push(
        [
          csvCell(r.created_at),
          csvCell(r.organizations?.name),
          csvCell(r.organization_id),
          csvCell(r.actor_user_id),
          csvCell(r.actor_role),
          csvCell(r.action),
          csvCell(r.category),
          csvCell(r.severity),
          csvCell(r.resource_type),
          csvCell(r.resource_id),
          csvCell(r.before_data),
          csvCell(r.after_data),
        ].join(',')
      );
    }

    await writeAuditLog({
      organizationId: filters.organizationId || null,
      branchId: null,
      actorUserId: session.userId,
      actorRole: 'super_admin',
      action: 'AUDIT_LOG_EXPORTED',
      resourceType: 'AUDIT_LOG',
      category: 'security',
      severity: 'warning',
      afterData: { rowCount: rows.length, filters },
    });

    return { success: true, csv: lines.join('\n'), rowCount: rows.length };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to export audit logs',
    };
  }
}

const PlatformSearchSchema = z.object({
  query: z.string().min(2).max(100),
});

export type PlatformSearchResultItem = {
  type: 'clinic';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

function escapeIlike(term: string): string {
  return term.replace(/[%_]/g, '');
}

export async function platformTenantSearchAction(payload: unknown): Promise<{
  success: boolean;
  results?: PlatformSearchResultItem[];
  error?: string;
}> {
  try {
    const session = await resolveServerSession();
    if (!session?.isSuperAdmin) {
      return { success: false, error: 'Unauthorized' };
    }

    const { query } = PlatformSearchSchema.parse(payload);
    const term = escapeIlike(query.trim());
    const pattern = `%${term}%`;
    const adminClient = await createAdminClient();

    const { data, error } = await adminClient
      .from('organizations')
      .select('id, name, slug')
      .or(`name.ilike.${pattern},slug.ilike.${pattern}`)
      .limit(8);

    if (error) {
      return { success: false, error: error.message };
    }

    const results: PlatformSearchResultItem[] = (data || []).map((org) => ({
      type: 'clinic',
      id: org.id,
      title: org.name,
      subtitle: `/book/${org.slug}`,
      href: `/super-admin/organizations/${org.id}`,
    }));

    return { success: true, results };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Search failed',
    };
  }
}
