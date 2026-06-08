import { createAdminClient } from '@/lib/supabase/server';

export type AuditCategory = 'data' | 'access' | 'security' | 'billing';
export type AuditSeverity = 'info' | 'warning' | 'critical';

export interface AuditLogPayload {
  organizationId: string | null;
  branchId: string | null;
  actorUserId: string;
  actorRole: string;
  action: string;
  resourceType: string;
  resourceId?: string;
  category?: AuditCategory;
  severity?: AuditSeverity;
  beforeData?: any;
  afterData?: any;
  ipAddress?: string;
  userAgent?: string;
}

/**
 * Inserts a log entry into the audit trail using the elevated admin client.
 * Bypasses standard RLS restrictions to guarantee log insertion success.
 */
export async function writeAuditLog(payload: AuditLogPayload) {
  const supabase = await createAdminClient();

  const { error } = await supabase.from('audit_logs').insert({
    organization_id: payload.organizationId,
    branch_id: payload.branchId,
    actor_user_id: payload.actorUserId,
    actor_role: payload.actorRole,
    action: payload.action,
    resource_type: payload.resourceType,
    resource_id: payload.resourceId || null,
    category: payload.category || 'data',
    severity: payload.severity || 'info',
    before_data: payload.beforeData || null,
    after_data: payload.afterData || null,
    ip_address: payload.ipAddress || null,
    user_agent: payload.userAgent || null,
  });

  if (error) {
    console.error('Audit Log Insertion Failure:', error);
  }
}
