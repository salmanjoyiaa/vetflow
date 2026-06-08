import { createAdminClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/credentials';
import { MOCK_SUPER_ADMIN_DATA } from '@/lib/demo/mock-data';
import { estimateMrrForSubscriptions, estimatePlanMrr } from '@/lib/super-admin/mrr';
import PlatformChartsClient from '@/components/super-admin/PlatformChartsClient';
import KpiCard from '@/components/ui/premium/KpiCard';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import PageHeader from '@/components/ui/premium/PageHeader';
import Link from 'next/link';
import {
  Building,
  CheckCircle2,
  BadgeAlert,
  PlusCircle,
  Users,
  GitBranch,
  DollarSign,
  ArrowRight,
  Shield,
  Calendar,
} from 'lucide-react';

export const metadata = {
  title: 'Platform Performance',
  description: 'Track platform tenant activity and global subscription statistics.',
};

function buildSignupTrend(
  orgs: { created_at: string }[]
): { date: string; count: number }[] {
  const days = 30;
  const counts = new Map<string, number>();
  const now = new Date();
  for (let i = days - 1; i >= 0; i--) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split('T')[0];
    counts.set(key, 0);
  }
  for (const org of orgs) {
    const key = org.created_at.split('T')[0];
    if (counts.has(key)) {
      counts.set(key, (counts.get(key) || 0) + 1);
    }
  }
  return Array.from(counts.entries()).map(([date, count]) => ({
    date: date.slice(5),
    count,
  }));
}

export default async function SuperAdminDashboard() {
  let subs: {
    status: string;
    plan_name: string | null;
    trial_end: string | null;
    organization_id: string;
  }[] = [];
  let totalUsers = 0;
  let totalBranches = 0;
  let recentOrgs: { id: string; name: string; slug: string; created_at: string }[] = [];
  let allOrgs: { created_at: string; name: string; trial_end?: string | null }[] = [];
  let loadError: string | null = null;

  if (isDemoMode()) {
    subs = MOCK_SUPER_ADMIN_DATA.subscriptions.map((s, i) => ({
      ...s,
      trial_end: null,
      organization_id: `demo-${i}`,
    }));
    totalUsers = MOCK_SUPER_ADMIN_DATA.totalUsers;
    totalBranches = MOCK_SUPER_ADMIN_DATA.totalBranches;
    recentOrgs = MOCK_SUPER_ADMIN_DATA.recentOrgs;
    allOrgs = MOCK_SUPER_ADMIN_DATA.recentOrgs;
  } else {
    try {
      const adminClient = await createAdminClient();

      const [subsRes, profilesCountRes, branchesCountRes, recentOrgsRes, allOrgsRes] =
        await Promise.all([
          adminClient
            .from('subscription_status')
            .select('status, plan_name, trial_end, organization_id'),
          adminClient.from('user_profiles').select('id', { count: 'exact', head: true }),
          adminClient.from('branches').select('id', { count: 'exact', head: true }),
          adminClient
            .from('organizations')
            .select('id, name, slug, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          adminClient
            .from('organizations')
            .select('id, name, created_at, subscription_status ( trial_end )')
            .order('created_at', { ascending: false }),
        ]);

      if (subsRes.error) throw new Error(subsRes.error.message);
      if (profilesCountRes.error) throw new Error(profilesCountRes.error.message);
      if (branchesCountRes.error) throw new Error(branchesCountRes.error.message);
      if (recentOrgsRes.error) throw new Error(recentOrgsRes.error.message);

      subs = subsRes.data || [];
      totalUsers = profilesCountRes.count || 0;
      totalBranches = branchesCountRes.count || 0;
      recentOrgs = recentOrgsRes.data || [];
      allOrgs = (allOrgsRes.data || []).map((o) => {
        const sub = (o.subscription_status as { trial_end: string | null }[] | null)?.[0];
        return { created_at: o.created_at, name: o.name, trial_end: sub?.trial_end };
      });
    } catch (err: unknown) {
      loadError = err instanceof Error ? err.message : 'Failed to load platform data';
    }
  }

  if (loadError) {
    return (
      <GlassPanel className="border-destructive/30 text-destructive text-sm p-6">
        <p className="font-semibold mb-2">Platform dashboard could not load</p>
        <p className="text-xs opacity-80">{loadError}</p>
        <p className="text-xs mt-3 text-on-surface-variant">
          Ensure <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> is configured.
        </p>
      </GlassPanel>
    );
  }

  const totalClinics = subs.length;
  const trialClinics = subs.filter((s) => s.status === 'trial').length;
  const activeClinics = subs.filter((s) => s.status === 'active').length;
  const suspendedClinics = subs.filter((s) => s.status === 'suspended').length;
  const estimatedMRR = estimateMrrForSubscriptions(subs);

  const statusDistribution = [
    { name: 'active', value: activeClinics },
    { name: 'trial', value: trialClinics },
    { name: 'suspended', value: suspendedClinics },
    { name: 'cancelled', value: subs.filter((s) => s.status === 'cancelled').length },
  ].filter((d) => d.value > 0);

  const signupTrend = buildSignupTrend(allOrgs);

  const mrrByPlanMap = new Map<string, number>();
  for (const sub of subs) {
    if (sub.status !== 'active') continue;
    const plan = sub.plan_name || 'Other';
    mrrByPlanMap.set(plan, (mrrByPlanMap.get(plan) || 0) + estimatePlanMrr(sub.plan_name));
  }
  const mrrByPlan = Array.from(mrrByPlanMap.entries()).map(([plan, mrr]) => ({ plan, mrr }));

  const trialExpiringSoon = subs.filter((s) => {
    if (s.status !== 'trial' || !s.trial_end) return false;
    const end = new Date(s.trial_end);
    const in7 = new Date();
    in7.setDate(in7.getDate() + 7);
    return end <= in7 && end >= new Date();
  });

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl glass-panel border-primary/20 p-8 md:p-10 mesh-gradient">
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Platform Master Console
            </span>
          </div>
          <PageHeader
            title="Platform performance"
            description="Unified telemetry covering tenant aggregates, billing, signups, and system health."
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard label="Registered Tenants" value={totalClinics} icon={Building} />
        <KpiCard label="Active Paid" value={activeClinics} icon={CheckCircle2} trend="Paid tiers" />
        <KpiCard label="Trials" value={trialClinics} icon={PlusCircle} />
        <KpiCard label="Suspended" value={suspendedClinics} icon={BadgeAlert} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <KpiCard label="System Users" value={totalUsers} icon={Users} />
        <KpiCard label="Active Branches" value={totalBranches} icon={GitBranch} />
        <KpiCard
          label="Estimated MRR"
          value={`$${estimatedMRR}/mo`}
          icon={DollarSign}
          trend="Active subscriptions"
          className="col-span-2 lg:col-span-1"
        />
      </div>

      <PlatformChartsClient
        statusDistribution={statusDistribution}
        signupTrend={signupTrend}
        mrrByPlan={mrrByPlan}
      />

      {trialExpiringSoon.length > 0 && (
        <GlassPanel className="border-amber-500/30 bg-amber-500/5 p-5">
          <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider mb-3 flex items-center gap-2">
            <Calendar className="w-4 h-4" />
            Trials expiring within 7 days ({trialExpiringSoon.length})
          </h3>
          <ul className="text-xs space-y-2">
            {trialExpiringSoon.map((s) => (
              <li key={s.organization_id} className="flex justify-between text-on-surface-variant">
                <span>{s.plan_name || 'Trial'}</span>
                <span>{s.trial_end ? new Date(s.trial_end).toLocaleDateString() : '—'}</span>
              </li>
            ))}
          </ul>
        </GlassPanel>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        <GlassPanel className="lg:col-span-7 p-6">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Recent clinic signups
            </h3>
            <Link
              href="/super-admin/organizations"
              className="text-xs font-semibold text-primary flex items-center gap-1 hover:underline"
            >
              Manage tenants <ArrowRight className="w-3 h-3" />
            </Link>
          </div>
          {recentOrgs.length > 0 ? (
            <div className="divide-y divide-outline-variant/30 text-xs">
              {recentOrgs.map((o) => (
                <div
                  key={o.id}
                  className="py-3 flex justify-between items-center hover:bg-surface-container-high/50 px-2 rounded-lg"
                >
                  <div>
                    <span className="font-bold text-on-surface block">{o.name}</span>
                    <span className="text-[10px] text-on-surface-variant block">/book/{o.slug}</span>
                  </div>
                  <span className="text-[10px] text-on-surface-variant">
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic py-6">No recent signups.</p>
          )}
        </GlassPanel>

        <GlassPanel className="lg:col-span-5 p-6 flex flex-col justify-between">
          <div>
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
              Quick links
            </h3>
            <div className="space-y-2 text-xs">
              <Link href="/super-admin/billing" className="block text-primary hover:underline">
                Platform billing →
              </Link>
              <Link href="/super-admin/audit" className="block text-primary hover:underline">
                Audit log →
              </Link>
              <Link href="/super-admin/organizations" className="block text-primary hover:underline">
                Clinic support tools →
              </Link>
            </div>
          </div>
          <p className="text-[10px] text-on-surface-variant pt-4 border-t border-outline-variant/30">
            RLS active on all tenant databases · Last refresh {new Date().toLocaleTimeString()}
          </p>
        </GlassPanel>
      </div>
    </div>
  );
}
