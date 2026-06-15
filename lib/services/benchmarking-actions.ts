'use server';

import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { isClinicBenchmarkingEnabled } from '@/lib/auth/features';
import { createClient } from '@/lib/supabase/server';

export async function getClinicBenchmarkingDataAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'view_reports');

    const supabase = await createClient();
    const { data: sub } = await supabase
      .from('subscription_status')
      .select('features')
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();

    if (!isClinicBenchmarkingEnabled((sub?.features as Record<string, unknown>) || null)) {
      return { success: false, error: 'Clinic benchmarking is not enabled for this organization.' };
    }

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const { data: branches } = await supabase
      .from('branches')
      .select('id, name')
      .eq('organization_id', ctx.organizationId)
      .eq('is_active', true);

    const results = await Promise.all(
      (branches || []).map(async (b) => {
        const [inv, visits] = await Promise.all([
          supabase
            .from('invoices')
            .select('total, payment_status')
            .eq('branch_id', b.id)
            .gte('created_at', monthStartStr),
          supabase
            .from('visits')
            .select('consult_started_at, completed_at, status')
            .eq('branch_id', b.id)
            .gte('checked_in_at', monthStartStr)
            .eq('status', 'completed'),
        ]);

        const revenue = (inv.data || [])
          .filter((i) => i.payment_status === 'paid')
          .reduce((s, i) => s + Number(i.total), 0);

        let totalConsultMin = 0;
        let consultCount = 0;
        for (const v of visits.data || []) {
          if (v.consult_started_at && v.completed_at) {
            const ms =
              new Date(v.completed_at).getTime() - new Date(v.consult_started_at).getTime();
            totalConsultMin += ms / 60000;
            consultCount++;
          }
        }

        return {
          branchId: b.id,
          branchName: b.name,
          revenue,
          visitCount: visits.data?.length || 0,
          avgConsultMinutes: consultCount > 0 ? Math.round(totalConsultMin / consultCount) : null,
        };
      })
    );

    return { success: true, branches: results };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed', branches: [] };
  }
}

/** Platform-level anonymized aggregates for super-admin (opt-in orgs only). */
export async function getSuperAdminBenchmarkingAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx?.isSuperAdmin || ctx.isImpersonating) {
      throw new Error('Super-admin access required');
    }

    const supabase = await createClient();
    const { data: orgs } = await supabase
      .from('subscription_status')
      .select('organization_id, features')
      .not('features', 'is', null);

    const optedIn = (orgs || []).filter((o) =>
      isClinicBenchmarkingEnabled((o.features as Record<string, unknown>) || null)
    );

    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    let totalRevenue = 0;
    let totalVisits = 0;
    let orgCount = 0;

    for (const org of optedIn) {
      const { data: branches } = await supabase
        .from('branches')
        .select('id')
        .eq('organization_id', org.organization_id)
        .eq('is_active', true);

      let orgRevenue = 0;
      let orgVisits = 0;
      for (const b of branches || []) {
        const [inv, visits] = await Promise.all([
          supabase
            .from('invoices')
            .select('total, payment_status')
            .eq('branch_id', b.id)
            .gte('created_at', monthStartStr),
          supabase
            .from('visits')
            .select('id', { count: 'exact', head: true })
            .eq('branch_id', b.id)
            .gte('checked_in_at', monthStartStr)
            .eq('status', 'completed'),
        ]);
        orgRevenue += (inv.data || [])
          .filter((i) => i.payment_status === 'paid')
          .reduce((s, i) => s + Number(i.total), 0);
        orgVisits += visits.count || 0;
      }
      if (orgVisits > 0 || orgRevenue > 0) {
        totalRevenue += orgRevenue;
        totalVisits += orgVisits;
        orgCount++;
      }
    }

    return {
      success: true,
      platform: {
        optedInOrgs: orgCount,
        avgRevenuePerOrg: orgCount > 0 ? totalRevenue / orgCount : 0,
        avgVisitsPerOrg: orgCount > 0 ? totalVisits / orgCount : 0,
        totalRevenue,
        totalVisits,
      },
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed',
    };
  }
}
