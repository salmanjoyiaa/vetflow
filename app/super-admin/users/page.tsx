import { createAdminClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/premium/PageHeader';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import { resolveServerSession } from '@/lib/services/auth';
import SuperAdminUsersClient, {
  type SuperAdminRow,
} from '@/components/super-admin/SuperAdminUsersClient';
import ImpersonationMonitorClient, {
  type ImpersonationSessionRow,
} from '@/components/super-admin/ImpersonationMonitorClient';
import { Users } from 'lucide-react';

export const metadata = {
  title: 'Users & Access',
  description: 'Manage platform super admins, clinic staff counts, and impersonation sessions.',
};

const IMPERSONATION_TTL_MS = 4 * 60 * 60 * 1000; // mirrors impersonation cookie maxAge

export default async function SuperAdminUsersPage() {
  const session = await resolveServerSession();
  const adminClient = await createAdminClient();

  let admins: SuperAdminRow[] = [];
  let staffByOrg: { orgName: string; total: number }[] = [];
  let sessions: ImpersonationSessionRow[] = [];
  let loadError: string | null = null;

  try {
    const [profilesRes, authList, membersRes, sessionsRes] = await Promise.all([
      adminClient
        .from('user_profiles')
        .select('id, first_name, last_name')
        .eq('is_super_admin', true),
      adminClient.auth.admin.listUsers({ page: 1, perPage: 1000 }),
      adminClient
        .from('organization_members')
        .select('organization_id, is_active, organizations ( name )'),
      adminClient
        .from('impersonation_sessions')
        .select('id, super_admin_id, target_organization_id, started_at, reason, organizations ( name )')
        .eq('is_active', true)
        .order('started_at', { ascending: false }),
    ]);

    if (profilesRes.error) throw new Error(profilesRes.error.message);

    const authMap = new Map<string, { email: string; lastSignIn: string | null }>();
    for (const u of authList.data?.users || []) {
      authMap.set(u.id, { email: u.email || '', lastSignIn: u.last_sign_in_at || null });
    }
    const nameMap = new Map<string, string>();
    for (const p of profilesRes.data || []) {
      nameMap.set(p.id, [p.first_name, p.last_name].filter(Boolean).join(' '));
    }

    admins = (profilesRes.data || []).map((p) => ({
      id: p.id,
      name: [p.first_name, p.last_name].filter(Boolean).join(' '),
      email: authMap.get(p.id)?.email || '—',
      lastSignIn: authMap.get(p.id)?.lastSignIn || null,
      isSelf: p.id === session?.userId,
    }));

    // Staff counts per organization (active members only).
    const orgCounts = new Map<string, { name: string; total: number }>();
    for (const m of membersRes.data || []) {
      if (!m.is_active) continue;
      const name = (m.organizations as { name?: string } | null)?.name || 'Unknown clinic';
      const entry = orgCounts.get(m.organization_id) || { name, total: 0 };
      entry.total += 1;
      orgCounts.set(m.organization_id, entry);
    }
    staffByOrg = Array.from(orgCounts.values())
      .map((e) => ({ orgName: e.name, total: e.total }))
      .sort((a, b) => b.total - a.total);

    sessions = (sessionsRes.data || []).map((s) => ({
      id: s.id,
      actorName: nameMap.get(s.super_admin_id) || authMap.get(s.super_admin_id)?.email || 'Super admin',
      targetOrgName: (s.organizations as { name?: string } | null)?.name || 'Unknown clinic',
      targetOrgId: s.target_organization_id,
      reason: s.reason,
      startedAt: s.started_at,
      expiresAt: s.started_at
        ? new Date(new Date(s.started_at).getTime() + IMPERSONATION_TTL_MS).toISOString()
        : null,
    }));
  } catch (err: unknown) {
    loadError = err instanceof Error ? err.message : 'Failed to load user data';
  }

  if (loadError) {
    return (
      <GlassPanel className="border-destructive/30 text-destructive text-sm p-6">
        <p className="font-semibold mb-2">User management could not load</p>
        <p className="text-xs opacity-80">{loadError}</p>
        <p className="text-xs mt-3 text-on-surface-variant">
          Ensure <code className="font-mono">SUPABASE_SERVICE_ROLE_KEY</code> is configured.
        </p>
      </GlassPanel>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Users & access"
        description="Manage platform super admins, monitor clinic staffing, and oversee active impersonation sessions."
        icon={Users}
      />

      <SuperAdminUsersClient admins={admins} />

      <div>
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
          Clinic staff by organization
        </h3>
        {staffByOrg.length > 0 ? (
          <div className="grid sm:grid-cols-2 lg:grid-cols-3 gap-3">
            {staffByOrg.map((s) => (
              <GlassPanel key={s.orgName} className="p-4 flex items-center justify-between">
                <span className="text-xs font-semibold text-on-surface truncate">{s.orgName}</span>
                <span className="text-sm font-bold text-primary">{s.total}</span>
              </GlassPanel>
            ))}
          </div>
        ) : (
          <GlassPanel className="p-6">
            <p className="text-xs text-on-surface-variant italic">No active staff found.</p>
          </GlassPanel>
        )}
      </div>

      <ImpersonationMonitorClient sessions={sessions} />
    </div>
  );
}
