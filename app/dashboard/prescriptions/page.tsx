import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import { cookies } from 'next/headers';
import Link from 'next/link';
import PageHeader from '@/components/ui/premium/PageHeader';
import PrescriptionsListClient, {
  type PrescriptionListRow,
} from '@/components/prescriptions/PrescriptionsListClient';
import { FileText } from 'lucide-react';
import { normalizeOneToOne } from '@/lib/supabase/embed';

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

  const rows: PrescriptionListRow[] = (prescriptions ?? []).map((rx) => {
    const pet = normalizeOneToOne(rx.pets as { id: string; name: string; species: string } | null);
    const visit = normalizeOneToOne(
      rx.visits as { reason: string | null; is_emergency: boolean } | null
    );
    const doctor = normalizeOneToOne(
      rx.user_profiles as { first_name: string; last_name: string } | null
    );
    return {
      id: rx.id,
      revisionNumber: rx.revision_number,
      isFinalized: rx.is_finalized,
      createdAt: rx.created_at,
      petId: pet?.id ?? null,
      petName: pet?.name || 'Unknown patient',
      petSpecies: pet?.species || 'N/A',
      doctorFirstName: doctor?.first_name ?? null,
      doctorLastName: doctor?.last_name ?? null,
      visitReason: visit?.reason ?? null,
      isEmergency: visit?.is_emergency ?? false,
    };
  });

  return (
    <div className="space-y-8">
      <PageHeader
        title="Prescriptions"
        description="Review finalized and draft prescriptions for the active branch."
        icon={FileText}
      />

      <div className="glass-panel rounded-2xl border border-outline-variant/40 shadow-premium overflow-hidden">
        {rows.length > 0 ? (
          <PrescriptionsListClient prescriptions={rows} userRole={session.role} />
        ) : (
          <div className="p-10 text-center">
            <FileText className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
            <p className="text-xs text-on-surface-variant/40">
              No prescriptions recorded for this branch yet.
            </p>
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
