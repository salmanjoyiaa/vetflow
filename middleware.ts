import { NextRequest, NextResponse } from 'next/server';
import { updateSession } from '@/lib/supabase/middleware';

export async function middleware(request: NextRequest) {
  const { supabaseResponse, user } = await updateSession(request);

  const path = request.nextUrl.pathname;
  
  const isAuthPage = path.startsWith('/login') || path.startsWith('/register');
  const isDashboardPage = path.startsWith('/dashboard');
  const isSuperAdminPage = path.startsWith('/super-admin');

  // 1. Gating unauthenticated traffic
  if (!user && (isDashboardPage || isSuperAdminPage)) {
    const loginUrl = new URL('/login', request.url);
    // Preserves redirect destination
    loginUrl.searchParams.set('next', path);
    return NextResponse.redirect(loginUrl);
  }

  // 2. Redirecting authenticated users away from landing auth screens
  if (user && isAuthPage) {
    return NextResponse.redirect(new URL('/dashboard', request.url));
  }

  return supabaseResponse;
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     * - public assets
     */
    '/((?!_next/static|_next/image|favicon.ico|.*\\.(?:svg|png|jpg|jpeg|gif|webp)$).*)',
  ],
};
