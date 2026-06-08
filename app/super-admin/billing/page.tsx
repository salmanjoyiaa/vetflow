import { createAdminClient } from '@/lib/supabase/server';
import BillingTableClient, {
  type BillingRow,
} from '@/components/super-admin/BillingTableClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import KpiCard from '@/components/ui/premium/KpiCard';
import { estimateMrrForSubscriptions } from '@/lib/super-admin/mrr';
import { CreditCard, DollarSign, Users } from 'lucide-react';

export const metadata = {
  title: 'Platform Billing',
  description: 'Manage SaaS subscriptions across all clinic tenants.',
};

export default async function SuperAdminBillingPage() {
  const adminClient = await createAdminClient();

  const { data: orgList, error } = await adminClient
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      subscription_status (
        plan_name,
        status,
        trial_end,
        renewal_date,
        notes
      )
    `)
    .order('name', { ascending: true });

  if (error || !orgList) {
    return (
      <div className="glass-panel border-destructive/30 text-destructive text-sm p-6">
        Failed to load billing data: {error?.message}
      </div>
    );
  }

  type SubRow = {
    plan_name: string;
    status: string;
    trial_end: string | null;
    renewal_date: string | null;
    notes: string | null;
  };

  const rows: BillingRow[] = orgList.map((org) => {
    const sub = (org.subscription_status as SubRow[] | null)?.[0];
    return {
      organizationId: org.id,
      organizationName: org.name,
      slug: org.slug,
      plan_name: sub?.plan_name || '—',
      status: sub?.status || 'unknown',
      trial_end: sub?.trial_end || null,
      renewal_date: sub?.renewal_date || null,
      notes: sub?.notes || null,
    };
  });

  const subs = rows.map((r) => ({ status: r.status, plan_name: r.plan_name }));
  const estimatedMrr = estimateMrrForSubscriptions(subs);
  const activeCount = rows.filter((r) => r.status === 'active').length;
  const trialCount = rows.filter((r) => r.status === 'trial').length;

  return (
    <div className="space-y-8">
      <PageHeader
        title="Platform billing"
        description="SaaS subscription management for all ClinixDev clinic tenants. Patient-visit payments remain in each clinic's dashboard."
        icon={CreditCard}
      />

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4">
        <KpiCard label="Estimated MRR" value={`$${estimatedMrr}/mo`} icon={DollarSign} />
        <KpiCard label="Active paid" value={activeCount} icon={CreditCard} />
        <KpiCard label="On trial" value={trialCount} icon={Users} trend={`${rows.length} total tenants`} />
      </div>

      <BillingTableClient rows={rows} />
    </div>
  );
}
