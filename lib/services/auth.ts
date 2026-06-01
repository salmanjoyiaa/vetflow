import { createClient } from '@/lib/supabase/server';

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

/**
 * Resolves the authenticated user's profile, organization role, and authorized branches.
 * Built strictly for server-side actions, page route checks, and API endpoints.
 */
export async function resolveServerSession(): Promise<UserSessionDetails | null> {
  const supabase = await createClient();

  const { data: { user }, error: userError } = await supabase.auth.getUser();
  if (userError || !user) {
    return null;
  }

  // Retrieve core user profile metadata
  const { data: profile, error: profileError } = await supabase
    .from('user_profiles')
    .select('first_name, last_name, is_super_admin')
    .eq('id', user.id)
    .single();

  if (profileError || !profile) {
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
  const { data: membership, error: membershipError } = await supabase
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
    .single();

  if (membershipError || !membership) {
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

  // Clinic admins have access to all active branches.
  // Other roles must be explicitly assigned via branch_members.
  if (membership.role !== 'clinic_admin') {
    const { data: assignedBranchIds } = await supabase
      .from('branch_members')
      .select('branch_id')
      .eq('user_id', user.id);

    const ids = assignedBranchIds?.map((b) => b.branch_id) || [];
    branchesQuery = branchesQuery.in('id', ids);
  }

  const { data: branches } = await branchesQuery;

  // Resolve organizations name safely (Supabase joins return objects or arrays of objects)
  const orgObj = membership.organizations as any;
  const orgName = orgObj ? orgObj.name : '';

  return {
    userId: user.id,
    email: user.email || '',
    firstName: profile.first_name || '',
    lastName: profile.last_name || '',
    isSuperAdmin: false,
    role: membership.role as any,
    organizationId: membership.organization_id,
    organizationName: orgName,
    branches: branches || [],
  };
}
