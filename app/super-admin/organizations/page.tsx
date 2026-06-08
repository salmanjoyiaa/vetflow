import { createAdminClient } from '@/lib/supabase/server';
import OrganizationRegistryClient, {
  type OrgRegistryRow,
} from '@/components/super-admin/OrganizationRegistryClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { Building2, Plus } from 'lucide-react';
import Link from 'next/link';

export const metadata = {
  title: 'Clinic Administration',
  description: 'Manage clinic tenants and subscription states.',
};

type SubscriptionRow = {
  plan_name: string;
  status: string;
  trial_start: string | null;
  trial_end: string | null;
  renewal_date: string | null;
  notes: string | null;
  features: Record<string, boolean> | null;
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
        notes,
        features
      )
    `)
    .order('created_at', { ascending: false });

  if (error || !orgList) {
    return (
      <div className="glass-panel border-destructive/30 text-destructive text-sm p-6">
        Failed to load clinic tenants: {error?.message}
      </div>
    );
  }

  const orgs: OrgRegistryRow[] = orgList.map((org) => {
    const sub = (org.subscription_status as SubscriptionRow[] | null)?.[0];
    return {
      id: org.id,
      name: org.name,
      slug: org.slug,
      created_at: org.created_at,
      subscription: sub
        ? {
            plan_name: sub.plan_name,
            status: sub.status,
            trial_start: sub.trial_start,
            trial_end: sub.trial_end,
            renewal_date: sub.renewal_date,
            notes: sub.notes,
            features: sub.features,
          }
        : null,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clinic tenant registry"
        description="Review tenants, suspend or activate accounts, enter clinics with audit, and adjust plans."
        icon={Building2}
        actions={
          <Link
            href="/super-admin/organizations/new"
            className="inline-flex items-center gap-1.5 bg-primary hover:opacity-90 text-white py-2.5 px-4 rounded-2xl font-bold text-sm shadow-premium transition-all"
          >
            <Plus className="w-4 h-4" />
            Provision clinic
          </Link>
        }
      />
      <OrganizationRegistryClient orgs={orgs} />
    </div>
  );
}
