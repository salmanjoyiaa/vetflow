import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import WalkInDashboardClient from '@/components/dashboard/WalkInDashboardClient';
import { ClipboardList } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Walk-In Queue',
  description: 'Manage walk-in consultations and active doctor assignments.',
};

export default async function WalkInsPage() {
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Resolve branch context
  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('vetflow_branch_id')?.value;
  let activeBranchId = activeBranchCookie;

  if (!activeBranchId && session.branches.length > 0) {
    activeBranchId = session.branches[0].id;
  } else if (activeBranchId && !session.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = session.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs p-6 rounded-2xl">
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

  const doctors = doctorsData?.map((d) => ({
    id: d.user_id,
    firstName: (d.user_profiles as any).first_name || '',
    lastName: (d.user_profiles as any).last_name || '',
  })) || [];

  // 3. Fetch current waiting / consulting visits
  const { data: visitsData } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      checked_in_at,
      pets ( id, name, species, breed ),
      customers ( first_name, last_name, phone ),
      visit_assignments (
        doctor_id,
        user_profiles ( first_name, last_name )
      )
    `)
    .eq('branch_id', activeBranchId)
    .in('status', ['waiting', 'consulting'])
    .order('checked_in_at', { ascending: true });

  const visits = visitsData?.map((v) => ({
    id: v.id,
    reason: v.reason,
    status: v.status,
    checkedInAt: v.checked_in_at,
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
    doctor: v.visit_assignments?.[0]
      ? {
          first_name: (v.visit_assignments[0].user_profiles as any).first_name,
          last_name: (v.visit_assignments[0].user_profiles as any).last_name,
        }
      : null,
  })) || [];

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
          <ClipboardList className="w-5 h-5 text-primary-teal" />
          Walk-in Queue Board
        </h2>
        <p className="text-xs text-graphite/70 mt-1">
          Check in walk-in clients and monitor room queue allocations.
        </p>
      </div>

      {/* DASHBOARD GRID CONTENT */}
      <WalkInDashboardClient 
        doctors={doctors}
        activeBranchId={activeBranchId}
        initialVisits={visits}
      />

    </div>
  );
}
