import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import PageHeader from '@/components/ui/premium/PageHeader';
import { FileText, Download, ExternalLink, AlertTriangle } from 'lucide-react';

export const metadata = {
  title: 'Prescriptions',
  description: 'View and manage clinic prescriptions across your branch.',
};

export default async function PrescriptionsPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/prescriptions');
  if (denied) return denied;

  const session = ctx;

  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('clinix_branch_id')?.value;
  let activeBranchId = activeBranchCookie;

  if (!activeBranchId && session.branches.length > 0) {
    activeBranchId = session.branches[0].id;
  } else if (activeBranchId && !session.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = session.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to view prescriptions.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: prescriptions, error } = await supabase
    .from('prescriptions')
    .select(`
      id,
      revision_number,
      is_finalized,
      created_at,
      notes,
      pets:patients ( id, name, species ),
      visits ( reason, is_emergency ),
      user_profiles ( first_name, last_name )
    `)
    .eq('branch_id', activeBranchId)
    .order('created_at', { ascending: false })
    .limit(50);

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load prescriptions: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prescriptions"
        description="Review finalized and draft prescriptions for the active branch."
        icon={FileText}
      />

      <div className="glass-panel rounded-2xl border border-outline-variant/40 shadow-premium overflow-hidden">
        {prescriptions && prescriptions.length > 0 ? (
          <div className="divide-y divide-border/20">
            {prescriptions.map((rx: any) => (
              <div
                key={rx.id}
                className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/30 transition-colors"
              >
                <div>
                  <span className="text-xs font-bold text-on-surface block flex items-center gap-2 flex-wrap">
                    {rx.pets?.name || 'Unknown patient'}{' '}
                    <span className="text-on-surface-variant/40 font-normal">
                      ({rx.pets?.species || 'N/A'})
                    </span>
                    {rx.visits?.is_emergency && (
                      <span className="text-[9px] font-bold text-destructive inline-flex items-center gap-0.5 bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded-full">
                        <AlertTriangle className="w-2.5 h-2.5" />
                        Emergency
                      </span>
                    )}
                  </span>
                  <span className="text-[10px] text-on-surface-variant block mt-0.5">
                    Dr. {rx.user_profiles?.first_name} {rx.user_profiles?.last_name} • Rev{' '}
                    {rx.revision_number} •{' '}
                    {new Date(rx.created_at).toLocaleDateString()}
                  </span>
                  {rx.visits?.reason && (
                    <span className="text-[10px] text-on-surface-variant/40 block mt-0.5">
                      Visit: {rx.visits.reason.substring(0, 60)}
                    </span>
                  )}
                </div>
                <div className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                      rx.is_finalized
                        ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                        : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                    }`}
                  >
                    {rx.is_finalized ? 'Finalized' : 'Draft'}
                  </span>
                  {rx.pets?.id && (
                    <Link
                      href={
                        session.role === 'doctor'
                          ? `/dashboard/doctors/patients/${rx.pets.id}`
                          : `/dashboard/pets/${rx.pets.id}`
                      }
                      className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline"
                    >
                      Medical file <ExternalLink className="w-3 h-3" />
                    </Link>
                  )}
                  <a
                    href={`/api/prescriptions/${rx.id}/pdf`}
                    target="_blank"
                    rel="noopener noreferrer"
                    className="text-[10px] font-semibold text-on-surface bg-surface-container border border-outline-variant/40 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:border-primary-teal transition-colors"
                  >
                    <Download className="w-3 h-3" />
                    PDF
                  </a>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
            <p className="text-xs text-on-surface-variant/40">No prescriptions recorded for this branch yet.</p>
            <Link
              href="/dashboard/doctors"
              className="text-xs text-primary font-semibold mt-2 inline-block hover:underline"
            >
              Open doctor queue →
            </Link>
          </div>
        )}
      </div>
    </div>
  );
}

