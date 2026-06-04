import { createClient, createAdminClient } from '@/lib/supabase/server';
import type { User } from '@supabase/supabase-js';
import { isDemoMode, findDemoUserById, type DemoUser } from '@/lib/demo/credentials';
import { cookies } from 'next/headers';

export const DEMO_USER_COOKIE = 'vetflow_demo_user';

function demoUserToSession(demo: DemoUser): UserSessionDetails {
  return {
    userId: demo.id,
    email: demo.email,
    firstName: demo.firstName,
    lastName: demo.lastName,
    isSuperAdmin: demo.isSuperAdmin,
    role: demo.role === 'super_admin' ? 'super_admin' : demo.role,
    organizationId: demo.organizationId,
    organizationName: demo.organizationName,
    branches: demo.branches,
  };
}

export interface UserSessionDetails {
  userId: string;
  email: string;
  firstName: string;
  lastName: string;
  isSuperAdmin: boolean;
  role: 'super_admin' | 'clinic_admin' | 'doctor' | 'receptionist' | null;
  organizationId: string | null;
  organizationName: string | null;
  branches: { id: string; name: string }[];
}

interface UserProfileRow {
  first_name: string | null;
  last_name: string | null;
  is_super_admin: boolean;
}

/**
 * Ensures every authenticated auth user has a matching user_profiles row.
 * Handles accounts created directly in Supabase Auth where the DB trigger did not run.
 */
async function ensureUserProfile(user: User): Promise<UserProfileRow | null> {
  const supabase = await createClient();

  const { data: existing } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();

  if (existing) {
    return existing;
  }

  const metadata = user.user_metadata || {};
  const emailLocal = user.email?.split('@')[0] || 'User';

  const profilePayload = {
    id: user.id,
    first_name: (metadata.first_name as string) || emailLocal,
    last_name: (metadata.last_name as string) || '',
    phone: (metadata.phone as string) || null,
    is_super_admin: Boolean(metadata.is_super_admin),
  };

  try {
    const adminClient = await createAdminClient();
    const { data: created, error } = await adminClient
      .from('user_profiles')
      .upsert(profilePayload, { onConflict: 'id' })
      .select('first_name, last_name, is_super_admin')
      .single();

    if (!error && created) {
      return created;
    }
  } catch {
    // Admin client unavailable — fall through to read retry
  }

  const { data: retried } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, is_super_admin')
    .eq('id', user.id)
    .maybeSingle();

  return retried;
}

/**
 * Resolves the authenticated user's profile, organization role, and authorized branches.
 * Built strictly for server-side actions, page route checks, and API endpoints.
 */
export async function resolveServerSession(): Promise<UserSessionDetails | null> {
  // ── Demo mode: bypass Supabase entirely ──
  if (isDemoMode()) {
    const cookieStore = await cookies();
    const demoUserId = cookieStore.get(DEMO_USER_COOKIE)?.value;
    if (!demoUserId) return null;
    const demoUser = findDemoUserById(demoUserId);
    if (!demoUser) return null;
    return demoUserToSession(demoUser);
  }

  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return null;
  }

  const profile = await ensureUserProfile(user);
  if (!profile) {
    return null;
  }

  // Super Admin checks (bypasses tenant filters)
  if (profile.is_super_admin) {
    return {
      userId: user.id,
      email: user.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      isSuperAdmin: true,
      role: 'super_admin',
      organizationId: null,
      organizationName: null,
      branches: [],
    };
  }

  // Fetch organization membership details
  const { data: membership } = await supabase
    .from('organization_members')
    .select(`
      role, 
      organization_id, 
      organizations (
        name
      )
    `)
    .eq('user_id', user.id)
    .eq('is_active', true)
    .maybeSingle();

  if (!membership) {
    return {
      userId: user.id,
      email: user.email || '',
      firstName: profile.first_name || '',
      lastName: profile.last_name || '',
      isSuperAdmin: false,
      role: null,
      organizationId: null,
      organizationName: null,
      branches: [],
    };
  }

  // Fetch branches authorized for the user
  let branchesQuery = supabase
    .from('branches')
    .select('id, name')
    .eq('organization_id', membership.organization_id)
    .eq('is_active', true);

  if (membership.role !== 'clinic_admin') {
    const { data: assignedBranchIds } = await supabase
      .from('branch_members')
      .select('branch_id')
      .eq('user_id', user.id);

    const ids = assignedBranchIds?.map((b) => b.branch_id) || [];
    if (ids.length === 0) {
      return {
        userId: user.id,
        email: user.email || '',
        firstName: profile.first_name || '',
        lastName: profile.last_name || '',
        isSuperAdmin: false,
        role: membership.role as UserSessionDetails['role'],
        organizationId: membership.organization_id,
        organizationName: (membership.organizations as { name?: string } | null)?.name || '',
        branches: [],
      };
    }
    branchesQuery = branchesQuery.in('id', ids);
  }

  const { data: branches } = await branchesQuery;

  const orgName = (membership.organizations as { name?: string } | null)?.name || '';

  return {
    userId: user.id,
    email: user.email || '',
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    isSuperAdmin: false,
    role: membership.role as UserSessionDetails['role'],
    organizationId: membership.organization_id,
    organizationName: orgName,
    branches: branches || [],
  };
}

/**
 * Lightweight check used by middleware to pick the post-login destination.
 */
export async function resolvePostLoginDestination(userId: string): Promise<string | null> {
  const supabase = await createClient();
  const { data: profile } = await supabase
    .from('user_profiles')
    .select('is_super_admin')
    .eq('id', userId)
    .maybeSingle();

  if (!profile) {
    return null;
  }

  return profile.is_super_admin ? '/super-admin/dashboard' : '/dashboard';
}
