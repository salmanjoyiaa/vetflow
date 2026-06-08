import { createAdminClient } from '@/lib/supabase/server';
import { normalizeOneToOne } from '@/lib/supabase/embed';
import { notFound } from 'next/navigation';
import Link from 'next/link';
import PageHeader from '@/components/ui/premium/PageHeader';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import KpiCard from '@/components/ui/premium/KpiCard';
import SubscriptionForm from '@/components/forms/SubscriptionForm';
import TenantOrgActions from '@/components/super-admin/TenantOrgActions';
import OrganizationFeatureToggles from '@/components/super-admin/OrganizationFeatureToggles';
import { buildPlanPriceMap, planPrice } from '@/lib/super-admin/mrr';
import { badgeActiveClass, badgeDangerClass } from '@/lib/ui/dashboard-classes';
import {
  Building2,
  ArrowLeft,
  Users,
  GitBranch,
  PawPrint,
  Stethoscope,
  Receipt,
  FileText,
  DollarSign,
  ShieldCheck,
  CreditCard,
  History,
} from 'lucide-react';

export const metadata = {
  title: 'Clinic Detail',
  description: 'Full operational and billing overview for a clinic tenant.',
};

const ROLE_LABELS: Record<string, string> = {
  clinic_admin: 'Clinic Admins',
  doctor: 'Doctors',
  receptionist: 'Receptionists',
  super_admin: 'Super Admins',
};

type MemberRow = {
  role: string;
  is_active: boolean;
  user_id: string;
  user_profiles: { first_name: string | null; last_name: string | null } | null;
};

export default async function OrganizationDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const adminClient = await createAdminClient();

  const { data: org, error: orgError } = await adminClient
    .from('organizations')
    .select(
      `id, name, slug, clinic_type_id, accepts_public_booking, created_at,
       clinic_types ( label ),
       subscription_status ( plan_name, plan_id, status, trial_start, trial_end, renewal_date, notes, features )`
    )
    .eq('id', id)
    .maybeSingle();

  if (orgError) {
    return (
      <GlassPanel className="border-destructive/30 text-destructive text-sm p-6">
        <p className="font-semibold mb-2">Could not load clinic</p>
        <p className="text-xs opacity-80">{orgError.message}</p>
      </GlassPanel>
    );
  }
  if (!org) notFound();

  type SubRow = {
    plan_name: string;
    plan_id: string | null;
    status: string;
    trial_start: string | null;
    trial_end: string | null;
    renewal_date: string | null;
    notes: string | null;
    features: Record<string, boolean> | null;
  };
  const sub = normalizeOneToOne(org.subscription_status as SubRow | SubRow[] | null);

  const clinicTypeLabel =
    (org.clinic_types as { label?: string } | null)?.label || org.clinic_type_id;

  const [
    branchesRes,
    membersRes,
    plansRes,
    patientsCount,
    visitsCount,
    invoicesCount,
    documentsCount,
    paymentsRes,
    recentPaymentsRes,
    auditRes,
  ] = await Promise.all([
    adminClient
      .from('branches')
      .select('id, name, address, is_active, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: true }),
    adminClient
      .from('organization_members')
      .select('role, is_active, user_id, user_profiles ( first_name, last_name )')
      .eq('organization_id', id),
    adminClient.from('plans').select('id, price'),
    adminClient.from('patients').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    adminClient.from('visits').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    adminClient.from('invoices').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    adminClient.from('documents').select('id', { count: 'exact', head: true }).eq('organization_id', id),
    adminClient.from('payments').select('amount').eq('organization_id', id),
    adminClient
      .from('payments')
      .select('id, amount, payment_method, created_at, invoices ( invoice_number )')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(8),
    adminClient
      .from('audit_logs')
      .select('id, action, resource_type, actor_role, category, severity, created_at')
      .eq('organization_id', id)
      .order('created_at', { ascending: false })
      .limit(10),
  ]);

  const priceMap = buildPlanPriceMap(plansRes.data);
  const branches = branchesRes.data || [];
  const members = (membersRes.data || []) as MemberRow[];
  const staffCount = members.filter((m) => m.is_active).length;

  const totalRevenue = (paymentsRes.data || []).reduce(
    (sum, p) => sum + (Number(p.amount) || 0),
    0
  );
  const mrr = sub?.status === 'active' ? planPrice(sub.plan_id ?? sub.plan_name, priceMap) : 0;

  const membersByRole = members.reduce<Record<string, MemberRow[]>>((acc, m) => {
    (acc[m.role] ??= []).push(m);
    return acc;
  }, {});

  const isSuspended = sub?.status === 'suspended' || sub?.status === 'cancelled';
  const isActive = sub?.status === 'active' || sub?.status === 'trial';

  return (
    <div className="space-y-8">
      <Link
        href="/super-admin/organizations"
        className="inline-flex items-center gap-1.5 text-xs font-semibold text-on-surface-variant hover:text-on-surface"
      >
        <ArrowLeft className="w-3.5 h-3.5" />
        Back to tenant registry
      </Link>

      <PageHeader
        title={org.name}
        description={`/book/${org.slug} · ${clinicTypeLabel}`}
        icon={Building2}
        actions={
          <div className="flex flex-wrap items-center gap-2">
            {isActive ? (
              <span className={badgeActiveClass}>{sub?.status === 'trial' ? 'Trialing' : 'Active'}</span>
            ) : (
              <span className={badgeDangerClass}>{sub?.status || 'No subscription'}</span>
            )}
            <Link
              href={`/super-admin/audit?org=${org.id}`}
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10"
            >
              <History className="w-3.5 h-3.5" />
              Audit trail
            </Link>
            <Link
              href="/super-admin/billing"
              className="inline-flex items-center gap-1.5 text-xs font-bold text-primary border border-primary/30 px-3 py-1.5 rounded-lg hover:bg-primary/10"
            >
              <CreditCard className="w-3.5 h-3.5" />
              Billing
            </Link>
          </div>
        }
      />

      {/* Usage counters */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <KpiCard label="Patients" value={patientsCount.count || 0} icon={PawPrint} />
        <KpiCard label="Visits" value={visitsCount.count || 0} icon={Stethoscope} />
        <KpiCard label="Invoices" value={invoicesCount.count || 0} icon={Receipt} />
        <KpiCard label="Documents" value={documentsCount.count || 0} icon={FileText} />
        <KpiCard label="Staff" value={staffCount} icon={Users} />
        <KpiCard label="Branches" value={branches.length} icon={GitBranch} />
        <KpiCard label="Revenue (paid)" value={`$${totalRevenue.toLocaleString()}`} icon={DollarSign} />
        <KpiCard label="MRR" value={`$${mrr.toLocaleString()}/mo`} icon={DollarSign} />
      </div>

      <div className="grid lg:grid-cols-12 gap-6">
        {/* Left: overview + subscription + actions */}
        <div className="lg:col-span-5 space-y-6">
          <GlassPanel className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Overview</h3>
            <dl className="text-xs space-y-2">
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">Clinic type</dt>
                <dd className="font-semibold text-on-surface">{clinicTypeLabel}</dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">Public booking</dt>
                <dd className="font-semibold text-on-surface">
                  {org.accepts_public_booking ? 'Enabled' : 'Disabled'}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">Created</dt>
                <dd className="font-semibold text-on-surface">
                  {new Date(org.created_at).toLocaleDateString()}
                </dd>
              </div>
              <div className="flex justify-between gap-3">
                <dt className="text-on-surface-variant">Tenant ID</dt>
                <dd className="font-mono text-[10px] text-on-surface-variant select-all">{org.id}</dd>
              </div>
            </dl>
          </GlassPanel>

          <GlassPanel className="p-6 space-y-4">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Subscription</h3>
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
            {sub ? (
              <dl className="text-xs space-y-2">
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Plan</dt>
                  <dd className="font-semibold text-on-surface capitalize">{sub.plan_name}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Status</dt>
                  <dd className="font-semibold text-on-surface capitalize">{sub.status}</dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Trial ends</dt>
                  <dd className="font-semibold text-on-surface">
                    {sub.trial_end ? new Date(sub.trial_end).toLocaleDateString() : '—'}
                  </dd>
                </div>
                <div className="flex justify-between gap-3">
                  <dt className="text-on-surface-variant">Renews</dt>
                  <dd className="font-semibold text-on-surface">
                    {sub.renewal_date ? new Date(sub.renewal_date).toLocaleDateString() : '—'}
                  </dd>
                </div>
                {sub.notes && (
                  <div className="pt-2 border-t border-outline-variant/30">
                    <dt className="text-on-surface-variant mb-1">Notes</dt>
                    <dd className="text-on-surface">{sub.notes}</dd>
                  </div>
                )}
              </dl>
            ) : (
              <p className="text-xs text-on-surface-variant italic">No subscription record.</p>
            )}
          </GlassPanel>

          <GlassPanel className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <ShieldCheck className="w-4 h-4 text-primary" />
              Tenant actions
            </h3>
            <TenantOrgActions
              organizationId={org.id}
              organizationName={org.name}
              isSuspended={Boolean(isSuspended)}
            />
            {sub && (
              <div className="pt-2 border-t border-outline-variant/30">
                <OrganizationFeatureToggles organizationId={org.id} initialFeatures={sub.features} />
              </div>
            )}
          </GlassPanel>
        </div>

        {/* Right: branches + members + payments + audit */}
        <div className="lg:col-span-7 space-y-6">
          <GlassPanel className="p-6 space-y-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Branches ({branches.length})
            </h3>
            {branches.length > 0 ? (
              <ul className="divide-y divide-outline-variant/30 text-xs">
                {branches.map((b) => (
                  <li key={b.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-on-surface block">{b.name}</span>
                      {b.address && (
                        <span className="text-[10px] text-on-surface-variant">{b.address}</span>
                      )}
                    </div>
                    <span
                      className={
                        b.is_active
                          ? 'text-[10px] font-bold text-secondary'
                          : 'text-[10px] font-bold text-on-surface-variant'
                      }
                    >
                      {b.is_active ? 'Active' : 'Inactive'}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-on-surface-variant italic">No branches.</p>
            )}
          </GlassPanel>

          <GlassPanel className="p-6 space-y-4">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Members ({members.length})
            </h3>
            {members.length > 0 ? (
              <div className="space-y-4">
                {Object.entries(membersByRole).map(([role, list]) => (
                  <div key={role}>
                    <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider mb-1.5">
                      {ROLE_LABELS[role] || role} ({list.length})
                    </p>
                    <ul className="flex flex-wrap gap-2">
                      {list.map((m) => {
                        const name = [m.user_profiles?.first_name, m.user_profiles?.last_name]
                          .filter(Boolean)
                          .join(' ') || 'Unnamed user';
                        return (
                          <li
                            key={m.user_id}
                            className={`text-[10px] px-2.5 py-1 rounded-full border ${
                              m.is_active
                                ? 'border-outline-variant text-on-surface'
                                : 'border-outline-variant/40 text-on-surface-variant line-through'
                            }`}
                          >
                            {name}
                          </li>
                        );
                      })}
                    </ul>
                  </div>
                ))}
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant italic">No members.</p>
            )}
          </GlassPanel>

          <GlassPanel className="p-6 space-y-3">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Recent payments</h3>
            {(recentPaymentsRes.data || []).length > 0 ? (
              <ul className="divide-y divide-outline-variant/30 text-xs">
                {(recentPaymentsRes.data || []).map((p) => (
                  <li key={p.id} className="py-2.5 flex justify-between items-center">
                    <div>
                      <span className="font-semibold text-on-surface block">
                        {(p.invoices as { invoice_number?: string } | null)?.invoice_number || 'Payment'}
                      </span>
                      <span className="text-[10px] text-on-surface-variant capitalize">
                        {p.payment_method} · {new Date(p.created_at).toLocaleDateString()}
                      </span>
                    </div>
                    <span className="font-bold text-secondary">${Number(p.amount).toLocaleString()}</span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-on-surface-variant italic">No payments recorded.</p>
            )}
          </GlassPanel>

          <GlassPanel className="p-6 space-y-3">
            <div className="flex items-center justify-between">
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Recent activity</h3>
              <Link
                href={`/super-admin/audit?org=${org.id}`}
                className="text-[10px] font-bold text-primary hover:underline"
              >
                Full audit trail
              </Link>
            </div>
            {(auditRes.data || []).length > 0 ? (
              <ul className="divide-y divide-outline-variant/30 text-xs">
                {(auditRes.data || []).map((a) => (
                  <li key={a.id} className="py-2.5 flex justify-between items-center gap-3">
                    <div className="min-w-0">
                      <span className="font-semibold text-on-surface block truncate">{a.action}</span>
                      <span className="text-[10px] text-on-surface-variant">
                        {a.resource_type} · {a.actor_role || 'system'}
                      </span>
                    </div>
                    <span className="text-[10px] text-on-surface-variant shrink-0">
                      {new Date(a.created_at).toLocaleString()}
                    </span>
                  </li>
                ))}
              </ul>
            ) : (
              <p className="text-xs text-on-surface-variant italic">No audit activity yet.</p>
            )}
          </GlassPanel>
        </div>
      </div>
    </div>
  );
}
