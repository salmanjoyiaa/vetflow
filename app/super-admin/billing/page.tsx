import { createAdminClient } from '@/lib/supabase/server';
import { normalizeOneToOne } from '@/lib/supabase/embed';
import BillingTableClient, {
  type BillingRow,
} from '@/components/super-admin/BillingTableClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import KpiCard from '@/components/ui/premium/KpiCard';
import { buildPlanPriceMap, computeArr, computeMrr } from '@/lib/super-admin/mrr';
import { loadSuperAdminPlans } from '@/lib/super-admin/plans';
import { CreditCard, DollarSign, Users } from 'lucide-react';

export const metadata = {
  title: 'Platform Billing',
  description: 'Manage SaaS subscriptions across all clinic tenants.',
};

export default async function SuperAdminBillingPage() {
  const adminClient = await createAdminClient();

  const [orgRes, plansRes, paymentsRes, planOptions] = await Promise.all([
    adminClient
      .from('organizations')
      .select(`
        id,
        name,
        slug,
        subscription_status (
          plan_name,
          plan_id,
          status,
          trial_end,
          renewal_date,
          notes
        )
      `)
      .order('name', { ascending: true }),
    adminClient.from('plans').select('id, price'),
    adminClient.from('payments').select('amount, organization_id, created_at'),
    loadSuperAdminPlans(),
  ]);

  const { data: orgList, error } = orgRes;

  if (error || !orgList) {
    return (
      <div className="glass-panel border-destructive/30 text-destructive text-sm p-6">
        Failed to load billing data: {error?.message}
      </div>
    );
  }

  const priceMap = buildPlanPriceMap(plansRes.data);

  // Aggregate real patient-visit payments per organization.
  const paidByOrg = new Map<string, { total: number; last: string | null }>();
  for (const p of paymentsRes.data || []) {
    const entry = paidByOrg.get(p.organization_id) || { total: 0, last: null };
    entry.total += Number(p.amount) || 0;
    if (!entry.last || (p.created_at && p.created_at > entry.last)) {
      entry.last = p.created_at;
    }
    paidByOrg.set(p.organization_id, entry);
  }

  type SubRow = {
    plan_name: string;
    plan_id: string | null;
    status: string;
    trial_end: string | null;
    renewal_date: string | null;
    notes: string | null;
  };

  const rows: BillingRow[] = orgList.map((org) => {
    const sub = normalizeOneToOne(org.subscription_status as SubRow | SubRow[] | null);
    const paid = paidByOrg.get(org.id);
    return {
      organizationId: org.id,
      organizationName: org.name,
      slug: org.slug,
      plan_name: sub?.plan_name || '—',
      plan_id: sub?.plan_id || null,
      status: sub?.status || 'unknown',
      trial_end: sub?.trial_end || null,
      renewal_date: sub?.renewal_date || null,
      notes: sub?.notes || null,
      totalPaid: paid ? Math.round(paid.total * 100) / 100 : 0,
      lastPaymentDate: paid?.last || null,
    };
  });

  const subs = rows.map((r) => ({ status: r.status, plan_id: r.plan_id, plan_name: r.plan_name }));
  const estimatedMrr = computeMrr(subs, priceMap);
  const estimatedArr = computeArr(estimatedMrr);
  const activeCount = rows.filter((r) => r.status === 'active').length;
  const trialCount = rows.filter((r) => r.status === 'trial').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform billing"
        description="SaaS subscription management for all ClinixDev clinic tenants. Patient-visit payments remain in each clinic's dashboard."
        icon={CreditCard}
      />

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4">
        <KpiCard label="MRR" value={`$${estimatedMrr.toLocaleString()}/mo`} icon={DollarSign} />
        <KpiCard label="ARR" value={`$${estimatedArr.toLocaleString()}/yr`} icon={DollarSign} />
        <KpiCard label="Active paid" value={activeCount} icon={CreditCard} />
        <KpiCard label="On trial" value={trialCount} icon={Users} trend={`${rows.length} total tenants`} />
      </div>

      <BillingTableClient rows={rows} priceMap={priceMap} plans={planOptions} />
    </div>
  );
}
