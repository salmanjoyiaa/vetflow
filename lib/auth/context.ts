import { cookies } from 'next/headers';
import { createAdminClient } from '@/lib/supabase/server';
import {
  resolveServerSession,
  type UserSessionDetails,
} from '@/lib/services/auth';
import { IMPERSONATION_COOKIE } from '@/lib/auth/impersonation';
import {
  getCapabilitiesForRole,
  hasCapability,
  type Capability,
} from '@/lib/auth/capabilities';

export const BRANCH_COOKIE_NAME = 'vetflow_branch_id';

export interface ServerAuthContext extends UserSessionDetails {
  allowedBranchIds: string[];
  activeBranchId: string | null;
  capabilities: Capability[];
  isImpersonating: boolean;
}

export class AuthError extends Error {
  constructor(
    message: string,
    public readonly code: 'UNAUTHORIZED' | 'FORBIDDEN' | 'NO_BRANCH'
  ) {
    super(message);
    this.name = 'AuthError';
  }
}

function resolveActiveBranchId(
  session: UserSessionDetails,
  branchCookie: string | undefined
): string | null {
  const allowed = session.branches.map((b) => b.id);
  if (allowed.length === 0) {
    return null;
  }
  if (branchCookie && allowed.includes(branchCookie)) {
    return branchCookie;
  }
  return allowed[0] ?? null;
}

/**
 * Full server authorization context: session + branch cookie + capabilities.
 */
async function resolveImpersonatedClinicSession(
  session: UserSessionDetails,
  targetOrgId: string,
  branchCookie: string | undefined
): Promise<ServerAuthContext | null> {
  const adminClient = await createAdminClient();

  const { data: activeRow } = await adminClient
    .from('impersonation_sessions')
    .select('id')
    .eq('super_admin_id', session.userId)
    .eq('target_organization_id', targetOrgId)
    .eq('is_active', true)
    .maybeSingle();

  if (!activeRow) {
    return null;
  }

  const { data: org } = await adminClient
    .from('organizations')
    .select('id, name')
    .eq('id', targetOrgId)
    .single();

  const { data: branches } = await adminClient
    .from('branches')
    .select('id, name')
    .eq('organization_id', targetOrgId)
    .eq('is_active', true);

  const branchList = branches || [];
  const allowedBranchIds = branchList.map((b) => b.id);
  let activeBranchId: string | null = null;
  if (branchCookie && allowedBranchIds.includes(branchCookie)) {
    activeBranchId = branchCookie;
  } else if (allowedBranchIds.length > 0) {
    activeBranchId = allowedBranchIds[0];
  }

  const role = 'clinic_admin' as const;

  return {
    userId: session.userId,
    email: session.email,
    firstName: session.firstName,
    lastName: session.lastName,
    isSuperAdmin: true,
    role,
    organizationId: org?.id ?? targetOrgId,
    organizationName: org?.name ?? 'Clinic',
    branches: branchList,
    allowedBranchIds,
    activeBranchId,
    capabilities: getCapabilitiesForRole(role),
    isImpersonating: true,
  };
}

export async function resolveServerAuthContext(): Promise<ServerAuthContext | null> {
  const session = await resolveServerSession();
  if (!session) {
    return null;
  }

  const cookieStore = await cookies();
  const branchCookie = cookieStore.get(BRANCH_COOKIE_NAME)?.value;
  const impersonationOrgId = cookieStore.get(IMPERSONATION_COOKIE)?.value;

  if (session.isSuperAdmin && impersonationOrgId) {
    return resolveImpersonatedClinicSession(session, impersonationOrgId, branchCookie);
  }

  const allowedBranchIds = session.branches.map((b) => b.id);
  const activeBranchId = session.isSuperAdmin
    ? null
    : resolveActiveBranchId(session, branchCookie);

  return {
    ...session,
    allowedBranchIds,
    activeBranchId,
    capabilities: getCapabilitiesForRole(session.role),
    isImpersonating: false,
  };
}

export function assertAuthenticated(
  ctx: ServerAuthContext | null
): asserts ctx is ServerAuthContext {
  if (!ctx) {
    throw new AuthError('Unauthorized: Session is invalid.', 'UNAUTHORIZED');
  }
}

export function assertRole(
  ctx: ServerAuthContext,
  roles: Array<NonNullable<UserSessionDetails['role']>>
): void {
  if (!ctx.role || !roles.includes(ctx.role)) {
    throw new AuthError('Forbidden: Insufficient role.', 'FORBIDDEN');
  }
}

export function assertCapability(
  ctx: ServerAuthContext,
  capability: Capability
): void {
  if (!hasCapability(ctx.role, capability)) {
    throw new AuthError('Forbidden: Missing capability.', 'FORBIDDEN');
  }
}

export function assertBranchAccess(
  ctx: ServerAuthContext,
  branchId: string
): void {
  if (ctx.isSuperAdmin) {
    return;
  }
  if (!ctx.allowedBranchIds.includes(branchId)) {
    throw new AuthError(
      'Forbidden: Branch is not assigned to your account.',
      'FORBIDDEN'
    );
  }
}

export function assertOrganization(
  ctx: ServerAuthContext
): asserts ctx is ServerAuthContext & { organizationId: string } {
  if (!ctx.organizationId) {
    throw new AuthError('Forbidden: No organization context.', 'FORBIDDEN');
  }
}

export function assertActiveBranch(
  ctx: ServerAuthContext
): asserts ctx is ServerAuthContext & { activeBranchId: string } {
  if (!ctx.activeBranchId) {
    throw new AuthError(
      'No active branch: assign a branch to continue.',
      'NO_BRANCH'
    );
  }
}
