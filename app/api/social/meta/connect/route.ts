import { NextRequest, NextResponse } from 'next/server';
import {
  assertBranchAccess,
  assertCapability,
  assertFeature,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { buildOAuthUrl, isMetaConfigured } from '@/lib/social/meta-client';
import { encodeOAuthState } from '@/lib/social/oauth-state';

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;

  if (!isMetaConfigured()) {
    return NextResponse.redirect(
      `${origin}/dashboard/social?error=${encodeURIComponent('Meta app is not configured. Set META_APP_ID and META_APP_SECRET.')}`
    );
  }

  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_social');
    assertFeature(ctx, 'social_automation');
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/social?error=${encodeURIComponent('Access denied')}`);
  }

  const platform = request.nextUrl.searchParams.get('platform');
  const branchId = request.nextUrl.searchParams.get('branchId');

  if (platform !== 'facebook' && platform !== 'instagram') {
    return NextResponse.redirect(`${origin}/dashboard/social?error=${encodeURIComponent('Invalid platform')}`);
  }
  if (!branchId) {
    return NextResponse.redirect(`${origin}/dashboard/social?error=${encodeURIComponent('Branch required')}`);
  }

  try {
    assertBranchAccess(ctx, branchId);
  } catch {
    return NextResponse.redirect(`${origin}/dashboard/social?error=${encodeURIComponent('Invalid branch')}`);
  }

  const state = encodeOAuthState({
    organizationId: ctx.organizationId!,
    branchId,
    userId: ctx.userId,
    platform,
  });

  return NextResponse.redirect(buildOAuthUrl(state, origin));
}
