'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';

const MEDICAL_ACTIONS = [
  'CLINICAL_NOTE_CREATED',
  'CLINICAL_NOTE_UPDATED',
  'PRESCRIPTION_CREATED',
  'DOCUMENT_UPLOADED',
  'DOCUMENT_DELETED',
  'LAB_ORDER_CREATED',
  'LAB_ORDER_UPDATED',
];

export async function getMedicalRecordActivityAction(branchId: string, limit = 15) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);

    const supabase = await createClient();

    const { data: logs, error } = await supabase
      .from('audit_logs')
      .select('id, action, resource_type, created_at, actor_user_id, actor_role, after_data')
      .eq('organization_id', ctx.organizationId)
      .eq('branch_id', branchId)
      .in('action', MEDICAL_ACTIONS)
      .order('created_at', { ascending: false })
      .limit(limit);

    if (error) throw new Error(error.message);

    const actorIds = [
      ...new Set((logs || []).map((l) => l.actor_user_id).filter(Boolean)),
    ] as string[];

    const actorMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', actorIds);
      for (const a of actors || []) {
        actorMap.set(a.id, `${a.first_name} ${a.last_name}`.trim());
      }
    }

    const activities = (logs || []).map((log) => {
      const after = log.after_data as Record<string, unknown> | null;
      let summary = log.resource_type;
      if (after?.diagnosis) summary = String(after.diagnosis);
      else if (after?.status) summary = `${log.resource_type}: ${after.status}`;
      else if (after?.file_name) summary = String(after.file_name);

      return {
        id: log.id,
        action: log.action,
        actorName: actorMap.get(log.actor_user_id) || 'Staff',
        actorRole: log.actor_role || 'staff',
        resourceType: log.resource_type,
        createdAt: log.created_at,
        summary,
      };
    });

    return { success: true, activities };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load activity',
      activities: [],
    };
  }
}
