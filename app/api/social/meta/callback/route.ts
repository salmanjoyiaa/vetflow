import { NextRequest, NextResponse } from 'next/server';
import { createAdminClient } from '@/lib/supabase/server';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { encryptToken } from '@/lib/social/token-crypto';
import { decodeOAuthState } from '@/lib/social/oauth-state';
import {
  exchangeCodeForUserToken,
  exchangeForLongLivedUserToken,
  fetchPages,
  type MetaPage,
} from '@/lib/social/meta-client';
import { writeAuditLog } from '@/lib/services/audit';

async function saveConnection(
  opts: {
    organizationId: string;
    branchId: string;
    platform: 'facebook' | 'instagram';
    page: MetaPage;
    userId: string;
    userRole: string;
    tokenExpiresAt: string | null;
  }
) {
  const admin = await createAdminClient();
  const ig = opts.page.instagram_business_account;

  if (opts.platform === 'instagram' && !ig?.id) {
    throw new Error('This Facebook Page has no linked Instagram Business account.');
  }

  const row = {
    organization_id: opts.organizationId,
    branch_id: opts.branchId,
    platform: opts.platform,
    page_id: opts.page.id,
    page_name: opts.page.name,
    ig_account_id: opts.platform === 'instagram' ? ig!.id : ig?.id ?? null,
    ig_username: opts.platform === 'instagram' ? ig!.username ?? null : ig?.username ?? null,
    access_token_enc: encryptToken(opts.page.access_token),
    token_expires_at: opts.tokenExpiresAt,
    connected_by: opts.userId,
  };

  const { error } = await admin.from('social_connections').upsert(row, {
    onConflict: 'branch_id,platform',
  });

  if (error) throw new Error(error.message);

  await writeAuditLog({
    organizationId: opts.organizationId,
    branchId: opts.branchId,
    actorUserId: opts.userId,
    actorRole: opts.userRole,
    action: 'SOCIAL_CONNECTION_CREATED',
    resourceType: 'SOCIAL_CONNECTION',
    afterData: { platform: opts.platform, page_id: opts.page.id, page_name: opts.page.name },
  });
}

export async function GET(request: NextRequest) {
  const origin = request.nextUrl.origin;
  const redirectBase = `${origin}/dashboard/social`;

  const errorParam = request.nextUrl.searchParams.get('error');
  if (errorParam) {
    return NextResponse.redirect(
      `${redirectBase}?error=${encodeURIComponent(errorParam)}`
    );
  }

  const code = request.nextUrl.searchParams.get('code');
  const stateRaw = request.nextUrl.searchParams.get('state');

  if (!code || !stateRaw) {
    return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent('OAuth cancelled')}`);
  }

  const state = decodeOAuthState(stateRaw);
  if (!state) {
    return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent('Invalid OAuth state')}`);
  }

  const ctx = await resolveServerAuthContext();
  if (!ctx || ctx.userId !== state.userId) {
    return NextResponse.redirect(`${origin}/login`);
  }

  try {
    const shortToken = await exchangeCodeForUserToken(code, origin);
    const long = await exchangeForLongLivedUserToken(shortToken);
    const pages = await fetchPages(long.access_token);

    if (pages.length === 0) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent('No Facebook Pages found. You must be an admin of a Page.')}`
      );
    }

    const eligible =
      state.platform === 'instagram'
        ? pages.filter((p) => p.instagram_business_account?.id)
        : pages;

    if (eligible.length === 0) {
      return NextResponse.redirect(
        `${redirectBase}?error=${encodeURIComponent('No Page with a linked Instagram Business account found.')}`
      );
    }

    const tokenExpiresAt = long.expires_in
      ? new Date(Date.now() + long.expires_in * 1000).toISOString()
      : null;

    if (eligible.length === 1) {
      await saveConnection({
        organizationId: state.organizationId,
        branchId: state.branchId,
        platform: state.platform,
        page: eligible[0],
        userId: ctx.userId,
        userRole: ctx.role || 'clinic_admin',
        tokenExpiresAt,
      });
      return NextResponse.redirect(`${redirectBase}?connected=${state.platform}`);
    }

    const admin = await createAdminClient();
    const pagesJson = eligible.map((p) => ({
      id: p.id,
      name: p.name,
      ig_username: p.instagram_business_account?.username,
    }));

    await admin.from('social_oauth_pending').delete().eq('user_id', ctx.userId);

    const { data: pending, error: pendingErr } = await admin
      .from('social_oauth_pending')
      .insert({
        user_id: ctx.userId,
        organization_id: state.organizationId,
        branch_id: state.branchId,
        platform: state.platform,
        user_token_enc: encryptToken(long.access_token),
        pages_json: pagesJson,
        expires_at: new Date(Date.now() + 15 * 60 * 1000).toISOString(),
      })
      .select('id')
      .single();

    if (pendingErr || !pending) {
      throw new Error(pendingErr?.message || 'Failed to store page picker state');
    }

    return NextResponse.redirect(
      `${redirectBase}?pickPage=${pending.id}&platform=${state.platform}&branchId=${state.branchId}`
    );
  } catch (err: unknown) {
    const msg = err instanceof Error ? err.message : 'OAuth failed';
    return NextResponse.redirect(`${redirectBase}?error=${encodeURIComponent(msg)}`);
  }
}
