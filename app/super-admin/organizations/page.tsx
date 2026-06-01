import { createAdminClient } from '@/lib/supabase/server';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import { Building2, Calendar, ShieldCheck, XCircle, CheckCircle } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Clinic Administration',
  description: 'Manage clinic tenants and subscription states.',
};

export default async function SuperAdminOrganizations() {
  const adminClient = await createAdminClient();

  // Fetch organizations joined with subscription status details
  const { data: orgList, error } = await adminClient
    .from('organizations')
    .select(`
      id,
      name,
      slug,
      created_at,
      subscription_status (
        plan_name,
        status,
        trial_start,
        trial_end,
        renewal_date,
        notes
      )
    `)
    .order('created_at', { ascending: false });

  if (error || !orgList) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load clinic tenants: {error?.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
          <Building2 className="w-5 h-5 text-primary-teal" />
          Clinic Tenant Registry
        </h2>
        <p className="text-xs text-graphite/70 mt-1">
          Review clinic tenants, suspend/activate accounts, and adjust feature plans.
        </p>
      </div>

      {/* TENANT MATRIX */}
      <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-primary-ivory/40 border-b border-border/40 text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider">
              <th className="px-6 py-4">Clinic Name</th>
              <th className="px-6 py-4">Web Slug</th>
              <th className="px-6 py-4">Subscription Plan</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Timeline / Renewal</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-xs">
            {orgList.map((org) => {
              const sub = org.subscription_status?.[0] as any;
              return (
                <tr key={org.id} className="hover:bg-primary-ivory/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-primary-navy">
                    {org.name}
                  </td>
                  <td className="px-6 py-4 text-primary-teal font-semibold">
                    /book/{org.slug}
                  </td>
                  <td className="px-6 py-4 capitalize text-primary-navy font-semibold">
                    {sub ? sub.plan_name : 'No active plan'}
                  </td>
                  <td className="px-6 py-4">
                    {sub?.status === 'active' || sub?.status === 'trial' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle className="w-3 h-3" />
                        {sub.status === 'trial' ? 'Trialing' : 'Active'}
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <XCircle className="w-3 h-3" />
                        Suspended
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 space-y-0.5 text-graphite/70">
                    {sub?.renewal_date ? (
                      <div className="flex items-center gap-1">
                        <Calendar className="w-3.5 h-3.5 text-primary-teal/70" />
                        <span>Renews: {new Date(sub.renewal_date).toLocaleDateString()}</span>
                      </div>
                    ) : sub?.trial_end ? (
                      <div className="flex items-center gap-1 text-[10px]">
                        <Calendar className="w-3.5 h-3.5 text-graphite/40" />
                        <span>Trial End: {new Date(sub.trial_end).toLocaleDateString()}</span>
                      </div>
                    ) : (
                      <span>—</span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {sub && (
                      <SubscriptionForm
                        organizationId={org.id}
                        organizationName={org.name}
                        currentPlan={sub.plan_name}
                        currentStatus={sub.status}
                        currentTrialEnd={sub.trial_end}
                        currentRenewalDate={sub.renewal_date}
                        currentNotes={sub.notes}
                      />
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>

    </div>
  );
}
