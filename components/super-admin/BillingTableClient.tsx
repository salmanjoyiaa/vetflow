'use client';

import { useMemo, useState } from 'react';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import {
  badgeActiveClass,
  badgeDangerClass,
  tableHeadClass,
  tableRowClass,
} from '@/lib/ui/dashboard-classes';
import { estimatePlanMrr } from '@/lib/super-admin/mrr';
import { Calendar, CheckCircle, XCircle } from 'lucide-react';

export type BillingRow = {
  organizationId: string;
  organizationName: string;
  slug: string;
  plan_name: string;
  status: string;
  trial_end: string | null;
  renewal_date: string | null;
  notes: string | null;
};

interface BillingTableClientProps {
  rows: BillingRow[];
}

export default function BillingTableClient({ rows }: BillingTableClientProps) {
  const [statusFilter, setStatusFilter] = useState('all');
  const [planFilter, setPlanFilter] = useState('all');

  const plans = useMemo(() => {
    const set = new Set(rows.map((r) => r.plan_name).filter(Boolean));
    return Array.from(set).sort();
  }, [rows]);

  const filtered = useMemo(() => {
    return rows.filter((r) => {
      if (statusFilter !== 'all' && r.status !== statusFilter) return false;
      if (planFilter !== 'all' && r.plan_name !== planFilter) return false;
      return true;
    });
  }, [rows, statusFilter, planFilter]);

  const filteredMrr = filtered
    .filter((r) => r.status === 'active')
    .reduce((sum, r) => sum + estimatePlanMrr(r.plan_name), 0);

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-3 items-center">
        <select
          value={statusFilter}
          onChange={(e) => setStatusFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface"
        >
          <option value="all">All statuses</option>
          <option value="active">Active</option>
          <option value="trial">Trial</option>
          <option value="suspended">Suspended</option>
          <option value="cancelled">Cancelled</option>
        </select>
        <select
          value={planFilter}
          onChange={(e) => setPlanFilter(e.target.value)}
          className="text-xs px-3 py-2 rounded-xl bg-surface-container border border-outline-variant text-on-surface"
        >
          <option value="all">All plans</option>
          {plans.map((p) => (
            <option key={p} value={p}>
              {p}
            </option>
          ))}
        </select>
        <span className="text-xs text-on-surface-variant ml-auto">
          Filtered MRR: <strong className="text-secondary">${filteredMrr}/mo</strong>
        </span>
      </div>

      <GlassPanel className="p-0 overflow-hidden">
        <div className="overflow-x-auto">
          <table className="w-full text-left border-collapse text-xs">
            <thead>
              <tr className={tableHeadClass}>
                <th className="px-6 py-4">Clinic</th>
                <th className="px-6 py-4">Plan</th>
                <th className="px-6 py-4">Status</th>
                <th className="px-6 py-4">Est. MRR</th>
                <th className="px-6 py-4">Timeline</th>
                <th className="px-6 py-4 text-right">Manage</th>
              </tr>
            </thead>
            <tbody>
              {filtered.map((row) => {
                const isActive = row.status === 'active' || row.status === 'trial';
                const mrr = row.status === 'active' ? estimatePlanMrr(row.plan_name) : 0;
                return (
                  <tr key={row.organizationId} className={tableRowClass}>
                    <td className="px-6 py-4">
                      <span className="font-bold text-on-surface block">{row.organizationName}</span>
                      <span className="text-[10px] text-on-surface-variant">/book/{row.slug}</span>
                    </td>
                    <td className="px-6 py-4 capitalize font-semibold text-on-surface">
                      {row.plan_name || '—'}
                    </td>
                    <td className="px-6 py-4">
                      {isActive ? (
                        <span className={badgeActiveClass}>
                          <CheckCircle className="w-3 h-3" />
                          {row.status}
                        </span>
                      ) : (
                        <span className={badgeDangerClass}>
                          <XCircle className="w-3 h-3" />
                          {row.status}
                        </span>
                      )}
                    </td>
                    <td className="px-6 py-4 text-secondary font-bold">
                      {mrr > 0 ? `$${mrr}` : '—'}
                    </td>
                    <td className="px-6 py-4 text-on-surface-variant">
                      {row.renewal_date ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Renews {new Date(row.renewal_date).toLocaleDateString()}
                        </span>
                      ) : row.trial_end ? (
                        <span className="flex items-center gap-1">
                          <Calendar className="w-3.5 h-3.5" />
                          Trial ends {new Date(row.trial_end).toLocaleDateString()}
                        </span>
                      ) : (
                        '—'
                      )}
                    </td>
                    <td className="px-6 py-4 text-right">
                      <SubscriptionForm
                        organizationId={row.organizationId}
                        organizationName={row.organizationName}
                        currentPlan={row.plan_name}
                        currentStatus={row.status}
                        currentTrialEnd={row.trial_end || new Date().toISOString()}
                        currentRenewalDate={row.renewal_date || ''}
                        currentNotes={row.notes || ''}
                      />
                    </td>
                  </tr>
                );
              })}
            </tbody>
          </table>
        </div>
        {filtered.length === 0 && (
          <p className="text-xs text-on-surface-variant text-center py-12">No subscriptions match filters.</p>
        )}
      </GlassPanel>
    </div>
  );
}
