'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { LoginSchema, RegisterSchema } from '@/lib/validations/auth';
import { writeAuditLog } from '@/lib/services/audit';
import {
  resolveServerSession,
  resolveAuthenticatedDestination,
  DEMO_USER_COOKIE,
} from '@/lib/services/auth';
import { isDemoMode, findDemoUser } from '@/lib/demo/credentials';

export interface ActionResponse {
  success: boolean;
  error?: string;
  redirectTo?: string;
}

/**
 * Handles user login with email and password.
 */
export async function loginAction(payload: unknown): Promise<ActionResponse> {
  try {
    const parsed = LoginSchema.parse(payload);

    // ── Demo mode: validate against hardcoded credentials ──
    if (isDemoMode()) {
      const demoUser = findDemoUser(parsed.email, parsed.password);
      if (!demoUser) {
        return { success: false, error: 'Invalid credentials. Check the demo credentials listed below.' };
      }
      const cookieStore = await cookies();
      cookieStore.set(DEMO_USER_COOKIE, demoUser.id, {
        httpOnly: true,
        path: '/',
        sameSite: 'lax',
        maxAge: 60 * 60 * 24 * 7, // 7 days
      });
      const redirectTo = resolveAuthenticatedDestination({
        userId: demoUser.id,
        email: demoUser.email,
        firstName: demoUser.firstName,
        lastName: demoUser.lastName,
        isSuperAdmin: demoUser.isSuperAdmin,
        role: demoUser.role === 'super_admin' ? 'super_admin' : demoUser.role,
        organizationId: demoUser.organizationId,
        organizationName: demoUser.organizationName,
        branches: demoUser.branches,
      });
      return { success: true, redirectTo };
    }

    const supabase = await createClient();

    const { error } = await supabase.auth.signInWithPassword({
      email: parsed.email,
      password: parsed.password,
    });

    if (error) {
      return { success: false, error: error.message };
    }

    const session = await resolveServerSession();
    const redirectTo = session
      ? resolveAuthenticatedDestination(session)
      : '/account-setup';

    return { success: true, redirectTo };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred' };
  }
}

/**
 * Handles organization onboarding. Sets up a new organization, subscription status, 
 * initial branch, admin profiles, and default app/tax configurations in a structured transaction.
 */
export async function registerAction(payload: unknown): Promise<ActionResponse> {
  try {
    const parsed = RegisterSchema.parse(payload);
    const adminClient = await createAdminClient();

    // 1. Check if organization slug is already in use
    const { data: existingOrg } = await adminClient
      .from('organizations')
      .select('id')
      .eq('slug', parsed.orgSlug)
      .maybeSingle();

    if (existingOrg) {
      return { success: false, error: 'This clinic web address/slug is already in use.' };
    }

    // 2. Sign up user in Supabase Auth
    const { data: authData, error: authError } = await adminClient.auth.admin.createUser({
      email: parsed.email,
      password: parsed.password,
      email_confirm: true, // Auto-confirm email to bypass confirmation steps in local tests
      user_metadata: {
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        phone: parsed.phone,
        is_super_admin: false,
      },
    });

    if (authError || !authData.user) {
      return { success: false, error: authError?.message || 'Failed to create user account.' };
    }

    const userId = authData.user.id;

    // 3. Create the Organization
    const { data: org, error: orgError } = await adminClient
      .from('organizations')
      .insert({
        name: parsed.orgName,
        slug: parsed.orgSlug,
      })
      .select('id, name')
      .single();

    if (orgError || !org) {
      return { success: false, error: orgError?.message || 'Failed to create clinic organization.' };
    }

    const orgId = org.id;

    // 4. Create Organization Member (Role: clinic_admin)
    const { error: memberError } = await adminClient
      .from('organization_members')
      .insert({
        organization_id: orgId,
        user_id: userId,
        role: 'clinic_admin',
        is_active: true,
      });

    if (memberError) {
      return { success: false, error: memberError.message || 'Failed to bind organization role.' };
    }

    // 5. Create Subscription (Defaulting to Trial tier)
    const trialEnd = new Date();
    trialEnd.setDate(trialEnd.getDate() + 30); // 30 days trial

    const { error: subError } = await adminClient
      .from('subscription_status')
      .insert({
        organization_id: orgId,
        plan_name: 'trial',
        status: 'trial',
        trial_start: new Date().toISOString(),
        trial_end: trialEnd.toISOString(),
        notes: 'Initial sandbox registration',
      });

    if (subError) {
      return { success: false, error: subError.message || 'Failed to initialize subscription status.' };
    }

    // 6. Create Initial Branch
    const { data: branch, error: branchError } = await adminClient
      .from('branches')
      .insert({
        organization_id: orgId,
        name: parsed.branchName,
        address: parsed.branchAddress,
        phone: parsed.branchPhone,
        email: parsed.email,
        is_active: true,
      })
      .select('id, name')
      .single();

    if (branchError || !branch) {
      return { success: false, error: branchError?.message || 'Failed to initialize clinic branch.' };
    }

    const branchId = branch.id;

    // 7. Bind User to Initial Branch
    const { error: branchMemberError } = await adminClient
      .from('branch_members')
      .insert({
        branch_id: branchId,
        user_id: userId,
      });

    if (branchMemberError) {
      return { success: false, error: branchMemberError.message || 'Failed to assign user to branch.' };
    }

    // 8. Create Default Tax Settings
    await adminClient.from('tax_settings').insert({
      organization_id: orgId,
      is_enabled: true,
      tax_name: 'VAT',
      tax_percentage: 15.00, // Default 15%
      applies_to_products: true,
      applies_to_services: true,
    });

    // 9. Create Default App Settings
    await adminClient.from('app_settings').insert({
      organization_id: orgId,
      timezone: 'UTC',
      currency: 'USD',
    });

    // 10. Audit Logging (actor is the new admin)
    await writeAuditLog({
      organizationId: orgId,
      branchId: branchId,
      actorUserId: userId,
      actorRole: 'clinic_admin',
      action: 'STAFF_CREATED',
      resourceType: 'USER_PROFILE',
      resourceId: userId,
      afterData: { email: parsed.email, firstName: parsed.firstName, lastName: parsed.lastName },
    });

    await writeAuditLog({
      organizationId: orgId,
      branchId: branchId,
      actorUserId: userId,
      actorRole: 'clinic_admin',
      action: 'BRANCH_CREATED',
      resourceType: 'BRANCH',
      resourceId: branchId,
      afterData: { name: parsed.branchName },
    });

    return { success: true, redirectTo: '/login' };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred during registration.' };
  }
}

/**
 * Destroys user session and signs them out.
 */
export async function logoutAction(): Promise<void> {
  if (isDemoMode()) {
    const cookieStore = await cookies();
    cookieStore.delete(DEMO_USER_COOKIE);
    redirect('/login');
  }
  const supabase = await createClient();
  await supabase.auth.signOut();
  redirect('/login');
}
