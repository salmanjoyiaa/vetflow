'use server';

import {
  assertCapability,
  assertFeature,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { chatCompletion } from '@/lib/ai/llm-client';
import { createClient } from '@/lib/supabase/server';
import { writeAuditLog } from '@/lib/services/audit';

export async function generateAiAnalyticsReportAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'view_reports');
    assertFeature(ctx, 'reports');

    const supabase = await createClient();
    const branchId = ctx.activeBranchId;
    if (!branchId) throw new Error('Select a branch first.');

    const today = new Date().toISOString().slice(0, 10);
    const monthStart = new Date();
    monthStart.setDate(1);
    const monthStartStr = monthStart.toISOString().slice(0, 10);

    const [
      revenueRes,
      unpaidRes,
      visitsRes,
      lowStockRes,
      apptTodayRes,
      staffAttendanceRes,
    ] = await Promise.all([
      supabase
        .from('invoices')
        .select('total, payment_status')
        .eq('branch_id', branchId)
        .gte('created_at', monthStartStr),
      supabase
        .from('invoices')
        .select('total')
        .eq('branch_id', branchId)
        .eq('payment_status', 'unpaid'),
      supabase
        .from('visits')
        .select('status')
        .eq('branch_id', branchId)
        .gte('checked_in_at', monthStartStr),
      supabase
        .from('products')
        .select('name, stock_quantity, reorder_level')
        .eq('branch_id', branchId)
        .eq('is_active', true),
      supabase
        .from('appointments')
        .select('id', { count: 'exact', head: true })
        .eq('branch_id', branchId)
        .eq('preferred_date', today),
      supabase
        .from('attendance_records')
        .select('status')
        .eq('organization_id', ctx.organizationId)
        .eq('work_date', today),
    ]);

    const invoices = revenueRes.data || [];
    const paidTotal = invoices
      .filter((i) => i.payment_status === 'paid')
      .reduce((s, i) => s + Number(i.total), 0);
    const unpaidTotal = (unpaidRes.data || []).reduce((s, i) => s + Number(i.total), 0);
    const visitCount = visitsRes.data?.length || 0;
    const lowStock = (lowStockRes.data || []).filter(
      (p) => p.stock_quantity <= p.reorder_level
    );
    const checkedInStaff = (staffAttendanceRes.data || []).filter(
      (a) => a.status === 'present' || a.status === 'checked_in'
    ).length;

    const metricsBlock = `
Branch metrics (current month unless noted):
- Revenue (paid invoices): $${paidTotal.toFixed(2)}
- Unpaid outstanding: $${unpaidTotal.toFixed(2)}
- Visits this month: ${visitCount}
- Appointments today: ${apptTodayRes.count || 0}
- Low stock SKUs: ${lowStock.length} (${lowStock.map((p) => p.name).slice(0, 5).join(', ')})
- Staff checked in today: ${checkedInStaff}
`.trim();

    const narrativeResult = await chatCompletion(
      [
        {
          role: 'system',
          content:
            'You are a veterinary clinic business analyst. Given clinic metrics, provide a concise executive summary with 3-5 bullet recommendations for the clinic admin. Focus on revenue, operations, inventory, and staffing.',
        },
        { role: 'user', content: metricsBlock },
      ],
      { maxTokens: 600 }
    );

    if ('error' in narrativeResult) {
      throw new Error(narrativeResult.error);
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'AI_ANALYTICS_REPORT_GENERATED',
      resourceType: 'REPORT',
      resourceId: branchId,
      afterData: {
        paidTotal,
        unpaidTotal,
        visitCount,
        lowStockCount: lowStock.length,
      },
    });

    return {
      success: true,
      metrics: {
        paidTotal,
        unpaidTotal,
        visitCount,
        todayAppointments: apptTodayRes.count || 0,
        lowStockCount: lowStock.length,
        staffPresent: checkedInStaff,
      },
      narrative: narrativeResult.content,
    };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to generate report',
    };
  }
}
