import { redirect } from 'next/navigation';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import DeniedState from '@/components/ui/premium/DeniedState';
import { guardFeature } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import ReportsChartsWrapper from '@/components/dashboard/ReportsChartsWrapper';
import PageHeader from '@/components/ui/premium/PageHeader';
import { TrendingUp, DollarSign, Activity, Calendar, AlertCircle } from 'lucide-react';

export const metadata = {
  title: 'Reports & Analytics',
  description: 'Track clinic sales development and practice KPIs.',
};

function buildLastSixMonths(): { key: string; label: string }[] {
  const now = new Date();
  const months: { key: string; label: string }[] = [];
  for (let i = 5; i >= 0; i--) {
    const d = new Date(now.getFullYear(), now.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    const label = d.toLocaleString('default', { month: 'short' });
    months.push({ key, label });
  }
  return months;
}

export default async function ReportsPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    redirect('/login');
  }

  try {
    assertCapability(ctx, 'view_reports');
  } catch {
    return (
      <DeniedState
        title="Reports restricted"
        message="You do not have permission to view financial reports."
      />
    );
  }

  const featureDenied = guardFeature(ctx, 'reports');
  if (featureDenied) return featureDenied;

  const activeBranchId = ctx.activeBranchId ?? undefined;

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to open the reports dashboard.
      </div>
    );
  }

  const supabase = await createClient();
  const monthBuckets = buildLastSixMonths();
  const salesByMonth = Object.fromEntries(monthBuckets.map((m) => [m.key, 0]));

  const { data: invoices } = await supabase
    .from('invoices')
    .select('id, total, payment_status, created_at, visit_id')
    .eq('branch_id', activeBranchId);

  let totalSales = 0;
  let outstandingTotal = 0;
  const visitIds: string[] = [];

  invoices?.forEach((inv) => {
    const total = Number(inv.total || 0);
    totalSales += total;
    if (inv.payment_status === 'unpaid' || inv.payment_status === 'partially_paid') {
      outstandingTotal += total;
    }
    if (inv.visit_id) visitIds.push(inv.visit_id);
    const d = new Date(inv.created_at);
    const key = `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, '0')}`;
    if (salesByMonth[key] !== undefined) {
      salesByMonth[key] += total;
    }
  });

  const monthlySalesData = monthBuckets.map((m) => ({
    name: m.label,
    value: Math.round(salesByMonth[m.key] * 100) / 100,
  }));

  const { data: payments } = await supabase
    .from('payments')
    .select('payment_method, amount')
    .eq('branch_id', activeBranchId);

  const paymentMethodMap: Record<string, number> = {};
  payments?.forEach((p) => {
    paymentMethodMap[p.payment_method] =
      (paymentMethodMap[p.payment_method] || 0) + Number(p.amount);
  });

  const paymentChartData = Object.keys(paymentMethodMap).map((key) => ({
    name: key,
    value: paymentMethodMap[key],
  }));

  const { data: visits } = await supabase
    .from('visits')
    .select('id, status')
    .eq('branch_id', activeBranchId);

  const totalVisitsCount = visits?.length || 0;
  const completedVisitsCount = visits?.filter((v) => v.status === 'completed').length || 0;

  const { data: appts } = await supabase
    .from('appointments')
    .select('id')
    .eq('branch_id', activeBranchId);

  const totalApptsCount = appts?.length || 0;

  const invoiceIds = invoices?.map((i) => i.id) ?? [];
  const itemTotals: Record<string, number> = {};
  if (invoiceIds.length > 0) {
    const { data: invoiceItems } = await supabase
      .from('invoice_items')
      .select('name, total')
      .in('invoice_id', invoiceIds);

    invoiceItems?.forEach((row) => {
      const name = row.name as string;
      itemTotals[name] = (itemTotals[name] || 0) + Number(row.total || 0);
    });
  }
  const topItems = Object.entries(itemTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 8);

  const doctorTotals: Record<string, number> = {};
  if (visitIds.length > 0) {
    const { data: assignments } = await supabase
      .from('visit_assignments')
      .select('visit_id, user_profiles ( first_name, last_name )')
      .in('visit_id', visitIds);

    const visitToDoctor = new Map<string, string>();
    assignments?.forEach((a) => {
      const profile = a.user_profiles as { first_name?: string; last_name?: string } | null;
      if (profile) {
        visitToDoctor.set(
          a.visit_id,
          `Dr. ${profile.first_name ?? ''} ${profile.last_name ?? ''}`.trim()
        );
      }
    });

    invoices?.forEach((inv) => {
      if (!inv.visit_id) return;
      const doc = visitToDoctor.get(inv.visit_id);
      if (!doc) return;
      doctorTotals[doc] = (doctorTotals[doc] || 0) + Number(inv.total || 0);
    });
  }

  const salesByDoctor = Object.entries(doctorTotals)
    .sort((a, b) => b[1] - a[1])
    .slice(0, 6);

  return (
    <div className="space-y-8">
      <PageHeader
        title="Analytics & Insights"
        description="Review business revenue charts, check-in rates, and operational KPIs."
        icon={TrendingUp}
      />

      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">
            Attained Gross Sales
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-xl font-black text-on-surface">${totalSales.toFixed(2)}</span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">
            Outstanding Payments
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <AlertCircle className="w-4 h-4 text-amber-500" />
            <span className="text-xl font-black text-on-surface">
              ${outstandingTotal.toFixed(2)}
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">
            Attending Consultations
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <Activity className="w-4 h-4 text-primary" />
            <span className="text-xl font-black text-on-surface">
              {completedVisitsCount}{' '}
              <span className="text-xs text-on-surface-variant/50 font-semibold">
                / {totalVisitsCount}
              </span>
            </span>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">
            Registered Bookings
          </span>
          <div className="flex items-baseline gap-1 mt-1">
            <Calendar className="w-4 h-4 text-primary" />
            <span className="text-xl font-black text-on-surface">{totalApptsCount}</span>
          </div>
        </div>
      </div>

      <ReportsChartsWrapper salesData={monthlySalesData} paymentData={paymentChartData} />

      <div className="grid md:grid-cols-2 gap-6">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
            Sales by doctor
          </h3>
          {salesByDoctor.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {salesByDoctor.map(([name, amount]) => (
                <li key={name} className="flex justify-between">
                  <span className="text-on-surface-variant">{name}</span>
                  <span className="font-bold text-on-surface">${amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-on-surface-variant/60 italic">No attributed sales yet.</p>
          )}
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
            Top items & services
          </h3>
          {topItems.length > 0 ? (
            <ul className="space-y-2 text-xs">
              {topItems.map(([name, amount]) => (
                <li key={name} className="flex justify-between gap-4">
                  <span className="text-on-surface-variant truncate">{name}</span>
                  <span className="font-bold text-on-surface shrink-0">${amount.toFixed(2)}</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-on-surface-variant/60 italic">No invoice line items yet.</p>
          )}
        </div>
      </div>
    </div>
  );
}
