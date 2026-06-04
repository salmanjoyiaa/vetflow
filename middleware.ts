import { createServerClient } from '@supabase/ssr';
import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

const IMPERSONATION_COOKIE = 'vetflow_impersonation_org_id';
const DEMO_USER_COOKIE = 'vetflow_demo_user';

// Demo user roles lookup (mirrors lib/demo/credentials.ts but inlined for edge runtime)
const DEMO_ROLES: Record<string, { isSuperAdmin: boolean; hasOrg: boolean }> = {
  '77777777-7777-7777-7777-777777777777': { isSuperAdmin: true, hasOrg: false },
  'a9000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
  'ad000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
  'ar000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
  'b9000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
  'bd000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
};

interface ProfileGate {
  is_super_admin: boolean;
  has_membership: boolean;
}

async function resolveProfileGate(
  request: NextRequest,
  userId: string
): Promise<ProfileGate | null> {
  const supabase = createServerClient(
    process.env.NEXT_PUBLIC_SUPABASE_URL!,
    process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!,
    {
      cookies: {
        getAll() {
          return request.cookies.getAll();
        },
        setAll() {},
      },
    }
  );

  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  if (profile.is_super_admin) {
    return { is_super_admin: true, has_membership: false };
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('id')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  return {
    is_super_admin: false,
    has_membership: Boolean(membership),
  };
}

async function resolvePostLoginPath(
  request: NextRequest,
  userId: string
): Promise<string> {
  const gate = await resolveProfileGate(request, userId);
  if (!gate) {
    return '/account-setup';
  }
  if (gate.is_super_admin) {
    return '/super-admin/dashboard';
  }
  if (!gate.has_membership) {
    return '/account-setup';
  }
  return '/dashboard';
}

export async function middleware(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login') || path.startsWith('/register');
  const isAccountSetupPage = path.startsWith('/account-setup');
  const isDashboardPage = path.startsWith('/dashboard');
  const isSuperAdminPage = path.startsWith('/super-admin');

  // ── Demo mode: use cookie-based auth, skip Supabase ──
  if (process.env.NEXT_PUBLIC_DEMO_MODE === 'true') {
    const demoUserId = request.cookies.get(DEMO_USER_COOKIE)?.value;

    if (!demoUserId && (isDashboardPage || isSuperAdminPage || isAccountSetupPage)) {
      const loginUrl = new URL('/login', request.url);
      loginUrl.searchParams.set('next', path);
      return NextResponse.redirect(loginUrl);
    }

    if (demoUserId) {
      const demoRole = DEMO_ROLES[demoUserId];
      if (demoRole) {
        if (isAuthPage) {
          const dest = demoRole.isSuperAdmin ? '/super-admin/dashboard' : '/dashboard';
          return NextResponse.redirect(new URL(dest, request.url));
        }
        if (isSuperAdminPage && !demoRole.isSuperAdmin) {
          return NextResponse.redirect(new URL('/dashboard', request.url));
        }
        if (isDashboardPage && demoRole.isSuperAdmin) {
          return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
        }
      }
    }

    return NextResponse.next();
  }

  // ── Normal mode: Supabase auth ──
  const { supabaseResponse, user } = await updateSession(request);

  if (!user && (isDashboardPage || isSuperAdminPage || isAccountSetupPage)) {
    const loginUrl = new URL('/login', request.url);
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  if (user) {
    const destination = await resolvePostLoginPath(request, user.id);

    if (isAuthPage) {
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (isSuperAdminPage && destination !== '/super-admin/dashboard') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    const isImpersonating =
      destination === '/super-admin/dashboard' &&
      Boolean(request.cookies.get(IMPERSONATION_COOKIE)?.value);

    if (isSuperAdminPage && isImpersonating) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isDashboardPage) {
      if (destination === '/super-admin/dashboard' && !isImpersonating) {
        return NextResponse.redirect(new URL(destination, request.url));
      }
      if (destination === '/account-setup') {
        return NextResponse.redirect(new URL(destination, request.url));
      }
    }

    if (isAccountSetupPage && destination === '/dashboard') {
      return NextResponse.redirect(new URL('/dashboard', request.url));
    }

    if (isAccountSetupPage && destination === '/super-admin/dashboard') {
      return NextResponse.redirect(new URL(destination, request.url));
    }
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
