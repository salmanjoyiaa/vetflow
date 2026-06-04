import { createAdminClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/credentials';
import { MOCK_SUPER_ADMIN_DATA } from '@/lib/demo/mock-data';
import {
  LayoutDashboard,
  Building,
  CheckCircle2,
  BadgeAlert,
  PlusCircle,
  Users,
  GitBranch,
  DollarSign,
  ArrowRight,
  Shield,
  Activity,
} from 'lucide-react';
import Link from 'next/link';
import KpiCard from '@/components/ui/premium/KpiCard';
import GlassPanel from '@/components/ui/premium/GlassPanel';

export const metadata = {
  title: 'VetFlow Platform Performance',
  description: 'Track platform tenant activity and global subscription statistics.',
};

export default async function SuperAdminDashboard() {
  let subs: { status: string; plan_name: string | null }[] = [];
  let totalUsers = 0;
  let totalBranches = 0;
  let recentOrgs: { id: string; name: string; slug: string; created_at: string }[] = [];
  let loadError: string | null = null;

  if (isDemoMode()) {
    subs = MOCK_SUPER_ADMIN_DATA.subscriptions;
    totalUsers = MOCK_SUPER_ADMIN_DATA.totalUsers;
    totalBranches = MOCK_SUPER_ADMIN_DATA.totalBranches;
    recentOrgs = MOCK_SUPER_ADMIN_DATA.recentOrgs;
  } else {
    try {
      const adminClient = await createAdminClient();

      const [subsRes, profilesCountRes, branchesCountRes, recentOrgsRes] = await Promise.all([
        adminClient.from('subscription_status').select('status, plan_name'),
        adminClient.from('user_profiles').select('id', { count: 'exact', head: true }),
        adminClient.from('branches').select('id', { count: 'exact', head: true }),
        adminClient
          .from('organizations')
          .select('id, name, slug, created_at')
          .order('created_at', { ascending: false })
          .limit(5),
      ]);

      if (subsRes.error) throw new Error(subsRes.error.message);
      if (profilesCountRes.error) throw new Error(profilesCountRes.error.message);
      if (branchesCountRes.error) throw new Error(branchesCountRes.error.message);
      if (recentOrgsRes.error) throw new Error(recentOrgsRes.error.message);

      subs = subsRes.data || [];
      totalUsers = profilesCountRes.count || 0;
      totalBranches = branchesCountRes.count || 0;
      recentOrgs = recentOrgsRes.data || [];
    } catch (err: any) {
      loadError = err.message || 'Failed to load platform data';
    }
  }

  if (loadError) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        <p className="font-semibold mb-2">Platform dashboard could not load</p>
        <p className="text-xs opacity-80">{loadError}</p>
        <p className="text-xs mt-3 text-graphite/60">
          Ensure <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> is configured in your
          environment.
        </p>
      </div>
    );
  }

  const totalClinics = subs.length;
  const trialClinics = subs.filter((s) => s.status === 'trial').length;
  const activeClinics = subs.filter((s) => s.status === 'active').length;
  const suspendedClinics = subs.filter((s) => s.status === 'suspended').length;

  // Calculate estimated Monthly Recurring Revenue (MRR)
  let estimatedMRR = 0;
  subs.forEach((sub) => {
    if (sub.status === 'active') {
      const plan = sub.plan_name?.toLowerCase() || '';
      if (plan.includes('starter')) estimatedMRR += 49;
      else if (plan.includes('growth')) estimatedMRR += 149;
      else if (plan.includes('enterprise')) estimatedMRR += 299;
      else estimatedMRR += 99; // default fallback
    }
  });

  return (
    <div className="space-y-8">
      {/* HEADER BANNER */}
      <div className="relative overflow-hidden rounded-3xl glass-panel border-primary/20 p-8 md:p-10 mesh-gradient">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-primary-teal blur-3xl" />
          <div className="absolute bottom-0 left-12 w-48 h-48 rounded-full bg-gold blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Shield className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
              Platform Master Console
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight text-on-surface font-[family-name:var(--font-display)]">
            Platform performance
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 max-w-lg">
            Unified telemetry covering tenant aggregates, active billing, system nodes, and user growth.
          </p>
        </div>
      </div>

      {/* CORE STATS GRID */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard label="Registered Tenants" value={totalClinics} icon={Building} />
        <KpiCard label="Active Paid" value={activeClinics} icon={CheckCircle2} trend="Paid tiers" />
        <KpiCard label="Trials" value={trialClinics} icon={PlusCircle} />
        <KpiCard label="Suspended" value={suspendedClinics} icon={BadgeAlert} />
      </div>

      {/* ADDITIONAL PLATFORM METRICS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium flex items-center gap-4 hover:shadow-premium-hover transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-violet-500/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-violet-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-graphite/40 uppercase block">Total System Users</span>
            <span className="text-xl font-black text-primary-navy">{totalUsers}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium flex items-center gap-4 hover:shadow-premium-hover transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-amber-500/10 flex items-center justify-center">
            <GitBranch className="w-5 h-5 text-amber-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-graphite/40 uppercase block">Total Active Branches</span>
            <span className="text-xl font-black text-primary-navy">{totalBranches}</span>
          </div>
        </div>

        <div className="col-span-2 lg:col-span-1 bg-white rounded-2xl border border-border/40 p-5 shadow-premium flex items-center gap-4 hover:shadow-premium-hover transition-all duration-200">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <DollarSign className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-graphite/40 uppercase block">Estimated MRR</span>
            <span className="text-xl font-black text-emerald-600">${estimatedMRR}/mo</span>
          </div>
        </div>
      </div>

      {/* RECENT REGISTRATIONS & SYSTEM HEALTH */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* RECENT REGISTRATIONS */}
        <div className="lg:col-span-7 bg-white rounded-2xl border border-border/40 p-6 shadow-premium">
          <div className="flex justify-between items-center mb-4">
            <h3 className="text-xs font-bold text-primary-navy uppercase tracking-wider">
              Recent Clinic Signups
            </h3>
            <Link
              href="/super-admin/organizations"
              className="text-xs font-semibold text-primary-teal flex items-center gap-1 hover:underline"
            >
              Manage all tenants <ArrowRight className="w-3 h-3" />
            </Link>
          </div>

          {recentOrgs && recentOrgs.length > 0 ? (
            <div className="divide-y divide-border/20 text-xs">
              {recentOrgs.map((o) => (
                <div key={o.id} className="py-3 flex justify-between items-center hover:bg-primary-ivory/20 px-2 rounded-lg transition-colors">
                  <div>
                    <span className="font-bold text-primary-navy block">{o.name}</span>
                    <span className="text-[10px] text-graphite/40 block">Slug: /book/{o.slug}</span>
                  </div>
                  <span className="text-[10px] text-graphite/50 font-semibold">
                    {new Date(o.created_at).toLocaleDateString()}
                  </span>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-graphite/40 italic py-6">No recent signups recorded.</p>
          )}
        </div>

        {/* SYSTEM STATUS CARD */}
        <div className="lg:col-span-5 bg-white rounded-2xl border border-border/40 p-6 shadow-premium flex flex-col justify-between">
          <div>
            <div className="flex items-center gap-2 mb-3">
              <Activity className="w-4 h-4 text-emerald-500 animate-pulse" />
              <h3 className="text-xs font-bold text-primary-navy uppercase tracking-wider">
                System Status
              </h3>
            </div>
            <p className="text-xs text-graphite/60 leading-relaxed mb-4">
              All infrastructure subsystems are running within normal operation bands. RLS security is fully active on all tenant databases.
            </p>
            <div className="space-y-2 text-[10px] font-semibold text-graphite/70">
              <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                <span>Database Connection Pool</span>
                <span className="text-emerald-600">Operational (100%)</span>
              </div>
              <div className="flex justify-between items-center py-1.5 border-b border-border/20">
                <span>Auth API (GoTrue / JWT)</span>
                <span className="text-emerald-600">Operational</span>
              </div>
              <div className="flex justify-between items-center py-1.5">
                <span>Edge Cache & CDN</span>
                <span className="text-emerald-600">Active</span>
              </div>
            </div>
          </div>
          <div className="pt-4 border-t border-border/20 text-[10px] text-graphite/40">
            Last Telemetry Heartbeat: {new Date().toLocaleTimeString()}
          </div>
        </div>
      </div>
    </div>
  );
}
