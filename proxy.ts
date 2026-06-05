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
  'ae000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
  'b9000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
  'bd000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: true },
  'c9000000-0000-0000-0000-000000000000': { isSuperAdmin: false, hasOrg: false },
};

interface ProfileGate {
  is_super_admin: boolean;
  has_membership: boolean;
  has_branches: boolean;
  subscription_status: string | null;
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
    return {
      is_super_admin: true,
      has_membership: false,
      has_branches: false,
      subscription_status: null,
    };
  }

  const { data: membership } = await supabase
    .from('organization_members')
    .select('organization_id, role')
    .eq('user_id', userId)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership?.organization_id) {
    return {
      is_super_admin: false,
      has_membership: false,
      has_branches: false,
      subscription_status: null,
    };
  }

  let hasBranches = false;
  if (membership.role === 'clinic_admin') {
    const { count } = await supabase
      .from('branches')
      .select('id', { count: 'exact', head: true })
      .eq('organization_id', membership.organization_id)
      .eq('is_active', true);
    hasBranches = (count ?? 0) > 0;
  } else {
    const { count } = await supabase
      .from('branch_members')
      .select('branch_id', { count: 'exact', head: true })
      .eq('user_id', userId);
    hasBranches = (count ?? 0) > 0;
  }

  const { data: subscription } = await supabase
    .from('subscription_status')
    .select('status')
    .eq('organization_id', membership.organization_id)
    .maybeSingle();

  return {
    is_super_admin: false,
    has_membership: true,
    has_branches: hasBranches,
    subscription_status: subscription?.status ?? null,
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
  if (!gate.has_membership || !gate.has_branches) {
    return '/account-setup';
  }
  return '/dashboard';
}

export async function proxy(request: NextRequest) {
  const path = request.nextUrl.pathname;
  const isAuthPage = path.startsWith('/login') || path.startsWith('/register');
  const isAccountSetupPage = path.startsWith('/account-setup');
  const isSuspendedPage = path.startsWith('/suspended');
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
        const allowReauth = request.nextUrl.searchParams.get('reauth') === '1';
        if (isAuthPage && !allowReauth) {
          const dest = demoRole.isSuperAdmin 
            ? '/super-admin/dashboard' 
            : demoRole.hasOrg 
              ? '/dashboard' 
              : '/account-setup';
          return NextResponse.redirect(new URL(dest, request.url));
        }
        if (isSuperAdminPage && !demoRole.isSuperAdmin) {
          return NextResponse.redirect(new URL(demoRole.hasOrg ? '/dashboard' : '/account-setup', request.url));
        }
        if (isDashboardPage) {
          if (demoRole.isSuperAdmin) {
            return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
          }
          if (!demoRole.hasOrg) {
            return NextResponse.redirect(new URL('/account-setup', request.url));
          }
        }
        if (isAccountSetupPage) {
          if (demoRole.isSuperAdmin) {
            return NextResponse.redirect(new URL('/super-admin/dashboard', request.url));
          }
          if (demoRole.hasOrg) {
            return NextResponse.redirect(new URL('/dashboard', request.url));
          }
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
    const gate = await resolveProfileGate(request, user.id);
    const isLocked =
      gate &&
      !gate.is_super_admin &&
      gate.has_membership &&
      (gate.subscription_status === 'suspended' ||
        gate.subscription_status === 'cancelled');

    const allowReauth = request.nextUrl.searchParams.get('reauth') === '1';
    if (isAuthPage && !allowReauth) {
      return NextResponse.redirect(new URL(destination, request.url));
    }

    if (isLocked && isDashboardPage && !path.startsWith('/dashboard/upgrade')) {
      return NextResponse.redirect(new URL('/suspended', request.url));
    }

    if (isLocked && isSuspendedPage) {
      return supabaseResponse;
    }

    if (!isLocked && isSuspendedPage) {
      return NextResponse.redirect(new URL('/dashboard', request.url));
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
