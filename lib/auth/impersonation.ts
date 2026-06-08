import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const IMPERSONATION_COOKIE = 'clinix_impersonation_org_id';

export interface ImpersonationState {
  isImpersonating: boolean;
  targetOrganizationId: string | null;
  targetOrganizationName: string | null;
  sessionId: string | null;
}

export async function getImpersonationState(): Promise<ImpersonationState> {
  const session = await resolveServerSession();
  if (!session?.isSuperAdmin) {
    return {
      isImpersonating: false,
      targetOrganizationId: null,
      targetOrganizationName: null,
      sessionId: null,
    };
  }

  const cookieStore = await cookies();
  const orgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;
  if (!orgId) {
    return {
      isImpersonating: false,
      targetOrganizationId: null,
      targetOrganizationName: null,
      sessionId: null,
    };
  }

  const adminClient = await createAdminClient();
  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name')
    .eq('id', orgId)
    .maybeSingle();

  const { data: activeSession } = await adminClient
    .from('impersonation_sessions')
    .select('id')
    .eq('super_admin_id', session.userId)
    .eq('target_organization_id', orgId)
    .eq('is_active', true)
    .maybeSingle();

  if (!org || !activeSession) {
    return {
      isImpersonating: false,
      targetOrganizationId: null,
      targetOrganizationName: null,
      sessionId: null,
    };
  }

  return {
    isImpersonating: true,
    targetOrganizationId: org.id,
    targetOrganizationName: org.name,
    sessionId: activeSession.id,
  };
}

export async function clearImpersonationCookie(): Promise<void> {
  const cookieStore = await cookies();
  cookieStore.delete(IMPERSONATION_COOKIE);
}
