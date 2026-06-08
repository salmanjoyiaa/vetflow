import { createAdminClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/credentials';
import { MOCK_SUPER_ADMIN_DATA } from '@/lib/demo/mock-data';
import {
  buildPlanPriceMap,
  computeArr,
  computeMrr,
  planPrice,
  type PlanPriceMap,
} from '@/lib/super-admin/mrr';
import {
  SUPERADMIN_TOGGLEABLE_FEATURES,
  OPT_IN_FEATURES,
  FEATURE_LABELS,
} from '@/lib/auth/features';
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
  LayoutDashboard,
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
    plan_id: string | null;
    trial_end: string | null;
    organization_id: string;
    organization_name: string;
    features: Record<string, boolean> | null;
  }[] = [];
  let priceMap: PlanPriceMap = {};
  let totalUsers = 0;
  let totalBranches = 0;
  let recentOrgs: { id: string; name: string; slug: string; created_at: string }[] = [];
  let allOrgs: {
    id: string;
    created_at: string;
    name: string;
    clinic_type_id: string | null;
    trial_end?: string | null;
  }[] = [];
  let payments: { amount: number; organization_id: string }[] = [];
  let loadError: string | null = null;

  if (isDemoMode()) {
    priceMap = { trial: 0, starter: 29, pro: 79, enterprise: 199 };
    subs = MOCK_SUPER_ADMIN_DATA.subscriptions.map((s, i) => ({
      ...s,
      plan_id: s.plan_name,
      trial_end: null,
      organization_id: `demo-${i}`,
      organization_name: s.plan_name || `Demo clinic ${i + 1}`,
      features: null,
    }));
    totalUsers = MOCK_SUPER_ADMIN_DATA.totalUsers;
    totalBranches = MOCK_SUPER_ADMIN_DATA.totalBranches;
    recentOrgs = MOCK_SUPER_ADMIN_DATA.recentOrgs;
    allOrgs = MOCK_SUPER_ADMIN_DATA.recentOrgs.map((o) => ({
      id: o.id,
      name: o.name,
      created_at: o.created_at,
      clinic_type_id: 'vet',
    }));
  } else {
    try {
      const adminClient = await createAdminClient();

      const [subsRes, plansRes, profilesCountRes, branchesCountRes, recentOrgsRes, allOrgsRes, paymentsRes] =
        await Promise.all([
          adminClient
            .from('subscription_status')
            .select('status, plan_name, plan_id, trial_end, features, organization_id, organizations ( name )'),
          adminClient.from('plans').select('id, price'),
          adminClient.from('user_profiles').select('id', { count: 'exact', head: true }),
          adminClient.from('branches').select('id', { count: 'exact', head: true }),
          adminClient
            .from('organizations')
            .select('id, name, slug, created_at')
            .order('created_at', { ascending: false })
            .limit(5),
          adminClient
            .from('organizations')
            .select('id, name, created_at, clinic_type_id, subscription_status ( trial_end )')
            .order('created_at', { ascending: false }),
          adminClient.from('payments').select('amount, organization_id'),
        ]);

      if (subsRes.error) throw new Error(subsRes.error.message);
      if (plansRes.error) throw new Error(plansRes.error.message);
      if (profilesCountRes.error) throw new Error(profilesCountRes.error.message);
      if (branchesCountRes.error) throw new Error(branchesCountRes.error.message);
      if (recentOrgsRes.error) throw new Error(recentOrgsRes.error.message);

      priceMap = buildPlanPriceMap(plansRes.data);
      subs = (subsRes.data || []).map((s) => ({
        status: s.status,
        plan_name: s.plan_name,
        plan_id: s.plan_id,
        trial_end: s.trial_end,
        organization_id: s.organization_id,
        organization_name:
          (s.organizations as { name?: string } | null)?.name || 'Unknown clinic',
        features: (s.features as Record<string, boolean> | null) ?? null,
      }));
      totalUsers = profilesCountRes.count || 0;
      totalBranches = branchesCountRes.count || 0;
      recentOrgs = recentOrgsRes.data || [];
      allOrgs = (allOrgsRes.data || []).map((o) => {
        const sub = (o.subscription_status as { trial_end: string | null }[] | null)?.[0];
        return {
          id: o.id,
          created_at: o.created_at,
          name: o.name,
          clinic_type_id: o.clinic_type_id,
          trial_end: sub?.trial_end,
        };
      });
      payments = (paymentsRes.data || []).map((p) => ({
        amount: Number(p.amount) || 0,
        organization_id: p.organization_id,
      }));
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
  const estimatedMRR = computeMrr(subs, priceMap);
  const estimatedARR = computeArr(estimatedMRR);

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
    const plan = sub.plan_name || sub.plan_id || 'Other';
    mrrByPlanMap.set(
      plan,
      (mrrByPlanMap.get(plan) || 0) + planPrice(sub.plan_id ?? sub.plan_name, priceMap)
    );
  }
  const mrrByPlan = Array.from(mrrByPlanMap.entries()).map(([plan, mrr]) => ({ plan, mrr }));

  // ── Funnel / health metrics (point-in-time, from current state) ──
  const cancelledClinics = subs.filter((s) => s.status === 'cancelled').length;
  const paidClinics = activeClinics;
  const churnRate =
    totalClinics > 0 ? Math.round(((cancelledClinics + suspendedClinics) / totalClinics) * 100) : 0;
  const conversionRate =
    paidClinics + trialClinics > 0
      ? Math.round((paidClinics / (paidClinics + trialClinics)) * 100)
      : 0;

  // ── Clinic-type distribution ──
  const clinicTypeMap = new Map<string, number>();
  for (const o of allOrgs) {
    const key = o.clinic_type_id || 'unknown';
    clinicTypeMap.set(key, (clinicTypeMap.get(key) || 0) + 1);
  }
  const clinicTypeDistribution = Array.from(clinicTypeMap.entries()).map(([name, value]) => ({
    name,
    value,
  }));

  // ── Feature adoption (% of tenants with each feature enabled) ──
  const featureAdoption = SUPERADMIN_TOGGLEABLE_FEATURES.map((feature) => {
    const enabled = subs.filter((s) => {
      const f = s.features?.[feature];
      return OPT_IN_FEATURES.includes(feature) ? f === true : f !== false;
    }).length;
    return {
      feature: FEATURE_LABELS[feature] || feature,
      pct: totalClinics > 0 ? Math.round((enabled / totalClinics) * 100) : 0,
    };
  });

  // ── Revenue from real payments ──
  const orgPlanMap = new Map<string, string>();
  for (const s of subs) orgPlanMap.set(s.organization_id, s.plan_name || s.plan_id || 'other');
  const orgNameMap = new Map<string, string>();
  for (const s of subs) orgNameMap.set(s.organization_id, s.organization_name);
  for (const o of allOrgs) if (!orgNameMap.has(o.id)) orgNameMap.set(o.id, o.name);

  const totalRevenue = payments.reduce((sum, p) => sum + p.amount, 0);
  const revenueByOrgMap = new Map<string, number>();
  for (const p of payments) {
    revenueByOrgMap.set(p.organization_id, (revenueByOrgMap.get(p.organization_id) || 0) + p.amount);
  }
  const revenueByPlanMap = new Map<string, number>();
  for (const [orgId, rev] of revenueByOrgMap.entries()) {
    const plan = orgPlanMap.get(orgId) || 'other';
    revenueByPlanMap.set(plan, (revenueByPlanMap.get(plan) || 0) + rev);
  }
  const revenueByPlan = Array.from(revenueByPlanMap.entries()).map(([plan, revenue]) => ({
    plan,
    revenue: Math.round(revenue * 100) / 100,
  }));
  const revenueByClinic = Array.from(revenueByOrgMap.entries())
    .map(([orgId, revenue]) => ({
      clinic: orgNameMap.get(orgId) || 'Unknown',
      revenue: Math.round(revenue * 100) / 100,
    }))
    .sort((a, b) => b.revenue - a.revenue)
    .slice(0, 8);

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
            icon={LayoutDashboard}
          />
        </div>
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard label="Registered Tenants" value={totalClinics} icon={Building} />
        <KpiCard label="Active Paid" value={activeClinics} icon={CheckCircle2} trend="Paid tiers" />
        <KpiCard label="Trials" value={trialClinics} icon={PlusCircle} />
        <KpiCard label="Suspended" value={suspendedClinics} icon={BadgeAlert} />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard label="System Users" value={totalUsers} icon={Users} />
        <KpiCard label="Active Branches" value={totalBranches} icon={GitBranch} />
        <KpiCard
          label="MRR"
          value={`$${estimatedMRR.toLocaleString()}/mo`}
          icon={DollarSign}
          trend="Active subscriptions"
        />
        <KpiCard
          label="ARR"
          value={`$${estimatedARR.toLocaleString()}/yr`}
          icon={DollarSign}
          trend="MRR x 12"
        />
      </div>

      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard label="Paid clinics" value={paidClinics} icon={CheckCircle2} />
        <KpiCard label="Total revenue" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} trend="All payments" />
        <KpiCard label="Trial -> paid" value={`${conversionRate}%`} icon={PlusCircle} trend="Paid vs trial" />
        <KpiCard label="Churn" value={`${churnRate}%`} icon={BadgeAlert} trend="Suspended + cancelled" />
      </div>

      <PlatformChartsClient
        statusDistribution={statusDistribution}
        signupTrend={signupTrend}
        mrrByPlan={mrrByPlan}
        clinicTypeDistribution={clinicTypeDistribution}
        featureAdoption={featureAdoption}
        revenueByPlan={revenueByPlan}
        revenueByClinic={revenueByClinic}
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
                <Link
                  href={`/super-admin/organizations/${s.organization_id}`}
                  className="font-semibold text-on-surface hover:text-primary hover:underline"
                >
                  {s.organization_name}
                </Link>
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
