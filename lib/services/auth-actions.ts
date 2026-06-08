'use server';

import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { createClient } from '@/lib/supabase/server';
import { LoginSchema, RequestAccessSchema } from '@/lib/validations/auth';
import { sendEmail } from '@/lib/email';
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
 * Public self-serve registration is disabled. Clinics are provisioned by a
 * platform super admin only. Prospective clinics submit a request for access
 * which is routed to the ClinixDev team (Resend email + console fallback).
 */
export async function requestAccessAction(payload: unknown): Promise<ActionResponse> {
  try {
    const parsed = RequestAccessSchema.parse(payload);

    const salesInbox = process.env.CLINIXDEV_SALES_EMAIL || 'sales@clinixdev.com';
    const html = `
      <div style="font-family: sans-serif; max-width: 600px; margin: 0 auto; padding: 20px;">
        <h2 style="color:#0b132b;">New ClinixDev access request</h2>
        <p><strong>Name:</strong> ${parsed.fullName}</p>
        <p><strong>Email:</strong> ${parsed.email}</p>
        <p><strong>Clinic:</strong> ${parsed.clinicName}</p>
        <p><strong>Clinic type:</strong> ${parsed.clinicType || 'Not specified'}</p>
        <p><strong>Phone:</strong> ${parsed.phone || 'Not provided'}</p>
        <p><strong>Message:</strong><br/>${(parsed.message || '—').replace(/\n/g, '<br/>')}</p>
      </div>
    `;

    await sendEmail({
      to: salesInbox,
      subject: `Access request: ${parsed.clinicName}`,
      html,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to submit your request.' };
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
