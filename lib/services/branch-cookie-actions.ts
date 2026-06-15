'use server';

import { cookies } from 'next/headers';
import { revalidatePath } from 'next/cache';
import {
  assertBranchAccess,
  BRANCH_COOKIE_NAME,
  resolveServerAuthContext,
} from '@/lib/auth/context';

export async function setActiveBranchAction(branchId: string): Promise<{
  success: boolean;
  error?: string;
}> {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx || (ctx.isSuperAdmin && !ctx.isImpersonating)) {
      return { success: false, error: 'Unauthorized' };
    }

    assertBranchAccess(ctx, branchId);

    const cookieStore = await cookies();
    cookieStore.set(BRANCH_COOKIE_NAME, branchId, {
      path: '/',
      maxAge: 30 * 24 * 60 * 60,
      sameSite: 'lax',
      httpOnly: true,
      secure: process.env.NODE_ENV === 'production',
    });

    revalidatePath('/dashboard', 'layout');
    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to switch branch';
    return { success: false, error: message };
  }
}
