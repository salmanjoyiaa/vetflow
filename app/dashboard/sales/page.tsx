import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import DeniedState from '@/components/ui/premium/DeniedState';
import PageHeader from '@/components/ui/premium/PageHeader';
import SalesMonitorClient from '@/components/sales/SalesMonitorClient';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Retail Sales Monitor',
  description: 'Monitor counter sales and retail revenue.',
};

export default async function SalesMonitorPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/sales');
  if (denied) return denied;

  if (ctx.role !== 'clinic_admin') {
    return (
      <DeniedState
        title="Sales monitor restricted"
        message="Only clinic administrators can view the retail sales monitor."
      />
    );
  }

  const cookieStore = await cookies();
  let activeBranchId = cookieStore.get('clinix_branch_id')?.value;
  if (!activeBranchId && ctx.branches.length > 0) activeBranchId = ctx.branches[0].id;
  else if (activeBranchId && !ctx.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = ctx.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to view sales.
      </div>
    );
  }

  const supabase = await createClient();
  const today = new Date().toISOString().slice(0, 10);
  const thirtyDaysAgo = new Date();
  thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);
  const since = thirtyDaysAgo.toISOString().slice(0, 10);

  const { data: retailInvoices } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      total,
      created_at,
      created_by,
      customers ( first_name, last_name ),
      invoice_items ( name, quantity )
    `)
    .eq('branch_id', activeBranchId)
    .eq('sale_type', 'retail')
    .gte('created_at', `${since}T00:00:00`)
    .order('created_at', { ascending: false })
    .limit(200);

  const creatorIds = [
    ...new Set(
      (retailInvoices || [])
        .map((i) => i.created_by as string | null)
        .filter((id): id is string => Boolean(id))
    ),
  ];
  const creatorMap = new Map<string, string>();
  if (creatorIds.length > 0) {
    const { data: creators } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', creatorIds);
    for (const c of creators || []) {
      creatorMap.set(c.id, `${c.first_name} ${c.last_name}`.trim());
    }
  }

  const todaySales = (retailInvoices || []).filter((i) => i.created_at.slice(0, 10) === today);
  const todayRevenue = todaySales.reduce((s, i) => s + Number(i.total), 0);

  const productQty = new Map<string, number>();
  for (const inv of retailInvoices || []) {
    const items = inv.invoice_items as { name: string; quantity: number }[] | null;
    for (const item of items || []) {
      productQty.set(item.name, (productQty.get(item.name) || 0) + item.quantity);
    }
  }
  const topProducts = [...productQty.entries()]
    .map(([name, qty]) => ({ name, qty }))
    .sort((a, b) => b.qty - a.qty)
    .slice(0, 5);

  const sales = (retailInvoices || []).map((inv) => {
    const cust = inv.customers as { first_name?: string; last_name?: string } | null;
    const items = inv.invoice_items as { name: string; quantity: number }[] | null;
    const itemSummary = (items || []).map((i) => `${i.name} x${i.quantity}`).join(', ');
    return {
      id: inv.id,
      invoiceNumber: inv.invoice_number,
      createdAt: inv.created_at,
      customerName: cust ? `${cust.first_name} ${cust.last_name}`.trim() : '—',
      total: Number(inv.total),
      itemSummary: itemSummary || '—',
      soldByName: inv.created_by ? creatorMap.get(inv.created_by as string) || '—' : '—',
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Retail Sales Monitor"
        description="Track counter sales, revenue, and top-selling products."
        icon={BarChart3}
      />
      <SalesMonitorClient
        todayRevenue={todayRevenue}
        todayCount={todaySales.length}
        topProducts={topProducts}
        sales={sales}
      />
    </div>
  );
}
