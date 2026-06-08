'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import TenantOrgActions from '@/components/super-admin/TenantOrgActions';
import OrganizationFeatureToggles from '@/components/super-admin/OrganizationFeatureToggles';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import {
  badgeActiveClass,
  badgeDangerClass,
  tableHeadClass,
  tableRowClass,
} from '@/lib/ui/dashboard-classes';
import { AlertTriangle, Building2, Calendar, CheckCircle, Search, XCircle } from 'lucide-react';

export type OrgRegistryRow = {
  id: string;
  name: string;
  slug: string;
  created_at: string;
  subscription: {
    plan_name: string;
    status: string;
    trial_start: string | null;
    trial_end: string | null;
    renewal_date: string | null;
    notes: string | null;
    features: Record<string, boolean> | null;
  } | null;
};

interface OrganizationRegistryClientProps {
  orgs: OrgRegistryRow[];
}

export default function OrganizationRegistryClient({ orgs }: OrganizationRegistryClientProps) {
  const [search, setSearch] = useState('');
  const [statusFilter, setStatusFilter] = useState('all');

  const suspendedOrgs = useMemo(
    () =>
      orgs.filter(
        (o) =>
          o.subscription?.status === 'suspended' || o.subscription?.status === 'cancelled'
      ),
    [orgs]
  );

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return orgs.filter((org) => {
      const status = org.subscription?.status || 'unknown';
      if (statusFilter !== 'all' && status !== statusFilter) return false;
      if (!q) return true;
      return (
        org.name.toLowerCase().includes(q) ||
        org.slug.toLowerCase().includes(q) ||
        org.id.toLowerCase().includes(q)
      );
    });
  }, [orgs, search, statusFilter]);

  return (
    <div className="space-y-6">
      {suspendedOrgs.length > 0 && (
        <div className="bg-destructive/10 border border-destructive/30 rounded-2xl p-4 flex flex-wrap items-center gap-3">
          <AlertTriangle className="w-4 h-4 text-destructive shrink-0" />
          <p className="text-xs text-destructive flex-1 min-w-[200px]">
            <span className="font-bold">{suspendedOrgs.length} suspended</span> clinic
            {suspendedOrgs.length === 1 ? '' : 's'} need attention.
          </p>
          <div className="flex flex-wrap gap-2">
            {suspendedOrgs.slice(0, 3).map((o) => (
              <span
                key={o.id}
                className="text-[10px] font-bold px-2 py-1 rounded-full bg-destructive/15 text-destructive"
              >
                {o.name}
              </span>
            ))}
          </div>
        </div>
      )}

      <div className="flex flex-wrap gap-3">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
          <input
            type="text"
            placeholder="Search name, slug, or ID..."
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            className="w-full pl-9 pr-3 py-2.5 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface"
          />
        </div>
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2.5 rounded-xl bg-surface-container border border-outline-variant text-on-surface"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
      </div>

      <GlassPanel className="p-0 overflow-hidden">
        {filtered.length > 0 ? (
          <div className="overflow-x-auto">
            <table className="w-full text-left border-collapse">
              <thead>
                <tr className={tableHeadClass}>
                  <th className="px-6 py-4">Clinic</th>
                  <th className="px-6 py-4">Slug</th>
                  <th className="px-6 py-4">Plan</th>
                  <th className="px-6 py-4">Status</th>
                  <th className="px-6 py-4">Timeline</th>
                  <th className="px-6 py-4 text-right">Support</th>
                </tr>
              </thead>
              <tbody className="text-xs">
                {filtered.map((org) => {
                  const sub = org.subscription;
                  const isSuspended =
                    sub?.status === 'suspended' || sub?.status === 'cancelled';
                  const isActive = sub?.status === 'active' || sub?.status === 'trial';

                  return (
                    <tr key={org.id} className={tableRowClass}>
                      <td className="px-6 py-4">
                        <Link
                          href={`/super-admin/organizations/${org.id}`}
                          className="font-bold text-on-surface block hover:text-primary hover:underline"
                        >
                          {org.name}
                        </Link>
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
                          <div className="flex flex-wrap gap-2 justify-end">
                            <Link
                              href={`/super-admin/organizations/${org.id}`}
                              className="text-[10px] font-bold text-primary hover:underline"
                            >
                              Details
                            </Link>
                            <Link
                              href={`/super-admin/audit?org=${org.id}`}
                              className="text-[10px] font-bold text-primary hover:underline"
                            >
                              Audit
                            </Link>
                          </div>
                          <TenantOrgActions
                            organizationId={org.id}
                            organizationName={org.name}
                            isSuspended={Boolean(isSuspended)}
                          />
                          {sub && (
                            <OrganizationFeatureToggles
                              organizationId={org.id}
                              initialFeatures={sub.features}
                            />
                          )}
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
            <h3 className="text-sm font-bold text-on-surface">No matching tenants</h3>
            <p className="text-xs text-on-surface-variant mt-1">Adjust search or filters.</p>
          </div>
        )}
      </GlassPanel>
    </div>
  );
}
