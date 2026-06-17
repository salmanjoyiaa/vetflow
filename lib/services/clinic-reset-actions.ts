'use server';

import { createAdminClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertClinicAdmin,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { ClinicResetSchema } from '@/lib/validations/schemas';
import { setActiveBranchAction } from '@/lib/services/branch-cookie-actions';

async function countRows(
  admin: Awaited<ReturnType<typeof createAdminClient>>,
  table: string,
  orgId: string
): Promise<number> {
  const { count } = await admin
    .from(table)
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);
  return count || 0;
}

export async function resetClinicDataAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertClinicAdmin(ctx);
    assertCapability(ctx, 'manage_settings');

    if (ctx.isSuperAdmin && !ctx.isImpersonating) {
      throw new Error('Switch into a clinic session to reset clinic data.');
    }

    const parsed = ClinicResetSchema.parse(payload);
    const expectedPhrase = `RESET ${ctx.organizationName || 'Clinic'}`.trim();
    if (parsed.confirmationPhrase.trim() !== expectedPhrase) {
      throw new Error(`Type exactly: ${expectedPhrase}`);
    }

    const orgId = ctx.organizationId;
    const admin = await createAdminClient();

    const beforeData = {
      customers: await countRows(admin, 'customers', orgId),
      patients: await countRows(admin, 'patients', orgId),
      visits: await countRows(admin, 'visits', orgId),
      invoices: await countRows(admin, 'invoices', orgId),
      products: await countRows(admin, 'products', orgId),
      staffMembers: await countRows(admin, 'organization_members', orgId) - 1,
      branches: await countRows(admin, 'branches', orgId),
    };

    const { data: branchRows } = await admin
      .from('branches')
      .select('id')
      .eq('organization_id', orgId);

    const branchIds = (branchRows || []).map((b) => b.id);

    if (branchIds.length > 0) {
      await admin.from('branch_members').delete().in('branch_id', branchIds);
      await admin.from('branches').delete().eq('organization_id', orgId);
    }

    const orgScopedTables = [
      'services',
      'product_categories',
      'lab_tests',
      'social_connections',
      'social_posts',
      'camera_devices',
      'shifts',
      'attendance_records',
      'staff_schedule_templates',
      'staff_schedule_exceptions',
    ] as const;

    for (const table of orgScopedTables) {
      await admin.from(table).delete().eq('organization_id', orgId);
    }

    await admin
      .from('organization_members')
      .delete()
      .eq('organization_id', orgId)
      .neq('user_id', ctx.userId);

    const { data: newBranch, error: branchErr } = await admin
      .from('branches')
      .insert({
        organization_id: orgId,
        name: 'Main Branch',
        is_active: true,
      })
      .select('id')
      .single();

    if (branchErr || !newBranch) {
      throw new Error(branchErr?.message || 'Failed to create default branch.');
    }

    const { error: memberErr } = await admin.from('branch_members').insert({
      branch_id: newBranch.id,
      user_id: ctx.userId,
    });

    if (memberErr) {
      throw new Error(memberErr.message || 'Failed to assign admin to new branch.');
    }

    await writeAuditLog({
      organizationId: orgId,
      branchId: newBranch.id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'CLINIC_DATA_RESET',
      resourceType: 'ORGANIZATION',
      resourceId: orgId,
      category: 'security',
      severity: 'critical',
      beforeData,
      afterData: { newBranchId: newBranch.id },
    });

    await setActiveBranchAction(newBranch.id);

    return { success: true, newBranchId: newBranch.id };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to reset clinic data.',
    };
  }
}
