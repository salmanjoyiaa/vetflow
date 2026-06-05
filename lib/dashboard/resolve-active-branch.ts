import type { ServerAuthContext } from '@/lib/auth/context';

/**
 * Returns the active branch ID from auth context (cookie-resolved in layout).
 */
export function getActiveBranchId(ctx: ServerAuthContext): string | null {
  return ctx.activeBranchId;
}

export function requireActiveBranchId(ctx: ServerAuthContext): string | null {
  return ctx.activeBranchId;
}

export function getActiveBranchName(ctx: ServerAuthContext): string | null {
  if (!ctx.activeBranchId) return null;
  return ctx.branches.find((b) => b.id === ctx.activeBranchId)?.name ?? null;
}
