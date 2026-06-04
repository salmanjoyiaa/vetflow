import { createAdminClient } from '@/lib/supabase/server';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import TenantOrgActions from '@/components/super-admin/TenantOrgActions';
import PageHeader from '@/components/ui/premium/PageHeader';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import { badgeActiveClass, badgeDangerClass, tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import { Building2, Calendar, CheckCircle, XCircle } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Clinic Administration',
  description: 'Manage clinic tenants and subscription states.',
};

type SubscriptionRow = {
  plan_name: string;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  renewal_date: string | null;
  notes: string | null;
};

export default async function SuperAdminOrganizations() {
  const adminClient = await createAdminClient();

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
      <GlassPanel className="border-destructive/30 text-destructive text-sm">
        Failed to load clinic tenants: {error?.message}
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clinic tenant registry"
        description="Review tenants, suspend or activate accounts, impersonate with audit, and adjust plans."
        icon={Building2}
      />

      <GlassPanel className="p-0 overflow-hidden">
        {orgList.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-6 py-4">Clinic</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timeline</th>
                  <th className="px-6 py-4 text-right">Actions</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {orgList.map((org) => {
                  const sub = (org.subscription_status as SubscriptionRow[] | null)?.[0];
                  const isSuspended = sub?.status === 'suspended' || sub?.status === 'cancelled';
                  const isActive = sub?.status === 'active' || sub?.status === 'trial';

                  return (
                    <tr key={org.id} className={tableRowClass}>
                      <td className="px-6 py-4">
                        <span className="font-bold text-on-surface block">{org.name}</span>
                        <span className="text-[9px] text-outline block mt-0.5 select-all">
                          {org.id}
                        </span>
                      </td>
                      <td className="px-6 py-4 font-mono text-primary font-semibold">
                        /book/{org.slug}
                      </td>
                      <td className="px-6 py-4 capitalize text-on-surface font-semibold">
                        {sub?.plan_name || '—'}
                      </td>
                      <td className="px-6 py-4">
                        {isActive ? (
                          <span className={badgeActiveClass}>
                            <CheckCircle className="w-3 h-3" />
                            {sub?.status === 'trial' ? 'Trialing' : 'Active'}
                          </span>
                        ) : (
                          <span className={badgeDangerClass}>
                            <XCircle className="w-3 h-3" />
                            {sub?.status || 'Unknown'}
                          </span>
                        )}
                      </td>
                      <td className="px-6 py-4 text-on-surface-variant">
                        {sub?.renewal_date ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5 text-primary" />
                            Renews {new Date(sub.renewal_date).toLocaleDateString()}
                          </span>
                        ) : sub?.trial_end ? (
                          <span className="flex items-center gap-1">
                            <Calendar className="w-3.5 h-3.5" />
                            Trial ends {new Date(sub.trial_end).toLocaleDateString()}
                          </span>
                        ) : (
                          '—'
                        )}
                      </td>
                      <td className="px-6 py-4">
                        <div className="flex flex-col items-end gap-2">
                          <TenantOrgActions
                            organizationId={org.id}
                            organizationName={org.name}
                            isSuspended={Boolean(isSuspended)}
                          />
                          {sub && (
                            <SubscriptionForm
                              organizationId={org.id}
                              organizationName={org.name}
                              currentPlan={sub.plan_name}
                              currentStatus={sub.status}
                              currentTrialEnd={sub.trial_end || new Date().toISOString()}
                              currentRenewalDate={sub.renewal_date || ''}
                              currentNotes={sub.notes || ''}
                            />
                          )}
                        </div>
                      </td>
                    </tr>
                  );
                })}
              </tbody>
            </table>
          </div>
        ) : (
          <div className="p-16 text-center">
            <Building2 className="w-12 h-12 text-outline mx-auto mb-4" />
            <h3 className="text-sm font-bold text-on-surface">No clinic tenants</h3>
            <p className="text-xs text-on-surface-variant mt-1">New signups appear here automatically.</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
