import { createAdminClient } from '@/lib/supabase/server';
import { LayoutDashboard, Building, CheckCircle2, ShieldAlert, BadgeAlert, PlusCircle } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'VetFlow Platform Performance',
  description: 'Track platform tenant activity and global subscription statistics.',
};

export default async function SuperAdminDashboard() {
  const adminClient = await createAdminClient();

  // 1. Fetch subscription aggregates
  const { data: subs } = await adminClient
    .from('subscription_status')
    .select('status, plan_name');

  const totalClinics = subs?.length || 0;
  const trialClinics = subs?.filter((s) => s.status === 'trial').length || 0;
  const activeClinics = subs?.filter((s) => s.status === 'active').length || 0;
  const suspendedClinics = subs?.filter((s) => s.status === 'suspended').length || 0;

  // 2. Fetch recently registered organizations
  const { data: recentOrgs } = await adminClient
    .from('organizations')
    .select('id, name, slug, created_at')
    .order('created_at', { ascending: false })
    .limit(5);

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
          <LayoutDashboard className="w-5 h-5 text-primary-teal" />
          Platform performance
        </h2>
        <p className="text-xs text-graphite/70 mt-1">
          Unified telemetry covering tenant aggregates and paid subscriptions.
        </p>
      </div>

      {/* AGGREGATES MATRIX */}
      <div className="grid grid-cols-2 md:grid-cols-4 gap-6">
        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-graphite/40 uppercase block">Registered Tenants</span>
          <div className="flex items-baseline gap-1 mt-1">
            <Building className="w-4 h-4 text-primary-teal" />
            <span className="text-xl font-black text-primary-navy">{totalClinics}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-graphite/40 uppercase block">Active Paid Tiers</span>
          <div className="flex items-baseline gap-1 mt-1">
            <CheckCircle2 className="w-4 h-4 text-emerald-600" />
            <span className="text-xl font-black text-emerald-600">{activeClinics}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-graphite/40 uppercase block">Sandbox Trials</span>
          <div className="flex items-baseline gap-1 mt-1">
            <PlusCircle className="w-4 h-4 text-primary-teal" />
            <span className="text-xl font-black text-primary-navy">{trialClinics}</span>
          </div>
        </div>

        <div className="bg-white rounded-2xl border border-border/40 p-5 shadow-premium">
          <span className="text-[10px] font-bold text-graphite/40 uppercase block">Locked / Suspended</span>
          <div className="flex items-baseline gap-1 mt-1">
            <BadgeAlert className="w-4 h-4 text-destructive" />
            <span className="text-xl font-black text-destructive">{suspendedClinics}</span>
          </div>
        </div>
      </div>

      {/* RECENT REGISTRATIONS */}
      <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium max-w-xl">
        <h3 className="text-xs font-bold text-primary-navy uppercase tracking-wider mb-4">
          Recent Signups
        </h3>
        
        {recentOrgs && recentOrgs.length > 0 ? (
          <div className="divide-y divide-border/20 text-xs">
            {recentOrgs.map((o) => (
              <div key={o.id} className="py-3 flex justify-between items-center">
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

    </div>
  );
}
