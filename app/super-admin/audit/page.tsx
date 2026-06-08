import { createAdminClient } from '@/lib/supabase/server';
import { listAuditLogsAction } from '@/lib/services/super-admin-actions';
import AuditLogTableClient from '@/components/super-admin/AuditLogTableClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { ScrollText } from 'lucide-react';

export const metadata = {
  title: 'Platform Audit Log',
  description: 'Review platform and tenant audit trail.',
};

export default async function SuperAdminAuditPage({
  searchParams,
}: {
  searchParams: Promise<{ org?: string }>;
}) {
  const { org: initialOrgId } = await searchParams;
  const adminClient = await createAdminClient();

  const [logsRes, orgsRes] = await Promise.all([
    listAuditLogsAction({
      page: 1,
      pageSize: 50,
      organizationId: initialOrgId,
    }),
    adminClient.from('organizations').select('id, name').order('name'),
  ]);

  const logs = logsRes.success && logsRes.logs ? logsRes.logs : [];
  const total = logsRes.success ? logsRes.total || 0 : 0;
  const organizations = orgsRes.data || [];

  return (
    <div className="space-y-8">
      <PageHeader
        title="Audit log"
        description="Immutable record of platform and tenant actions. Filter by organization or action type."
        icon={ScrollText}
      />
      <AuditLogTableClient
        initialLogs={logs}
        initialTotal={total}
        organizations={organizations}
        initialOrgId={initialOrgId || ''}
      />
    </div>
  );
}
