import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import WalkInDashboardClient from '@/components/dashboard/WalkInDashboardClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { normalizeOneToOne } from '@/lib/supabase/embed';
import { ClipboardList } from 'lucide-react';

export const metadata = {
  title: 'Walk-In Queue',
  description: 'Manage walk-in consultations and active doctor assignments.',
};

export default async function WalkInsPage({
  searchParams,
}: {
  searchParams: Promise<{ new?: string }>;
}) {
  const { new: openIntake } = await searchParams;
  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    redirect('/login');
  }

  const denied = guardRoute(ctx, '/dashboard/walk-ins');
  if (denied) return denied;

  const session = ctx;

  // 1. Resolve branch context
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
        You must be assigned to a clinic branch to open the walk-in dashboard.
      </div>
    );
  }

  const supabase = await createClient();

  // 2. Fetch doctors in organization
  const { data: doctorsData } = await supabase
    .from('organization_members')
    .select(`
      user_id,
      user_profiles ( first_name, last_name )
    `)
    .eq('organization_id', session.organizationId)
    .eq('role', 'doctor')
    .eq('is_active', true);

  const doctors =
    doctorsData
      ?.filter((d) => d.user_profiles)
      .map((d) => {
        const profile = d.user_profiles as { first_name: string; last_name: string };
        return {
          id: d.user_id,
          firstName: profile.first_name || '',
          lastName: profile.last_name || '',
        };
      }) || [];

  // 3. Fetch current waiting / consulting visits
  const { data: visitsData } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      checked_in_at,
      is_emergency,
      triage_notes,
      pets:patients ( id, name, species, breed ),
      customers ( first_name, last_name, phone ),
      visit_assignments (
        doctor_id,
        user_profiles ( first_name, last_name )
      )
    `)
    .eq('branch_id', activeBranchId)
    .in('status', ['waiting', 'consulting'])
    .order('checked_in_at', { ascending: true });

  const { data: checkoutVisitsData } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      checked_in_at,
      pets:patients ( name ),
      customers ( first_name, last_name )
    `)
    .eq('branch_id', activeBranchId)
    .eq('status', 'ready_for_checkout')
    .order('checked_in_at', { ascending: true });

  const visits = visitsData
    ?.filter((v) => v.pets && v.customers)
    .map((v) => ({
      id: v.id,
      reason: v.reason,
      status: v.status,
      checkedInAt: v.checked_in_at,
      isEmergency: v.is_emergency ?? false,
      triageNotes: v.triage_notes,
      pet: {
        id: (v.pets as any).id,
        name: (v.pets as any).name,
        species: (v.pets as any).species,
        breed: (v.pets as any).breed,
      },
      customer: {
        first_name: (v.customers as any).first_name,
        last_name: (v.customers as any).last_name,
        phone: (v.customers as any).phone,
      },
      doctor: (() => {
        const assignment = normalizeOneToOne(
          v.visit_assignments as
            | { user_profiles: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }
            | { user_profiles: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null }[]
            | null
        );
        const profile = normalizeOneToOne(assignment?.user_profiles ?? null);
        return profile
          ? { first_name: profile.first_name, last_name: profile.last_name }
          : null;
      })(),
    })) || [];

  const checkoutVisits =
    checkoutVisitsData
      ?.filter((v) => v.pets && v.customers)
      .map((v) => ({
        id: v.id,
        reason: v.reason,
        petName: (v.pets as { name: string }).name,
        customerName: `${(v.customers as { first_name: string; last_name: string }).first_name} ${(v.customers as { first_name: string; last_name: string }).last_name}`,
      })) || [];

  return (
    <div className="space-y-8">
      
      <PageHeader
        title="Walk-in queue board"
        description="Check in walk-in clients and monitor room queue allocations."
        icon={ClipboardList}
      />

      {/* DASHBOARD GRID CONTENT */}
      <WalkInDashboardClient
        doctors={doctors}
        activeBranchId={activeBranchId}
        initialVisits={visits}
        checkoutVisits={checkoutVisits}
        highlightIntake={openIntake === '1'}
      />

    </div>
  );
}

