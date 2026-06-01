import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { BriefcaseMedical, Play, ClipboardList, CheckCircle, Heart, User } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Doctor Dashboard',
  description: 'Attending physician workspace queue.',
};

export default async function DoctorDashboardPage() {
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  if (!['doctor', 'clinic_admin'].includes(session.role || '')) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Access Denied: Only attending veterinarians can access this dashboard.
      </div>
    );
  }

  const supabase = await createClient();

  // Fetch visits assigned to this doctor that are in waiting or consulting phase
  const { data: visitsData, error } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      checked_in_at,
      pets ( id, name, species, breed, gender ),
      customers ( first_name, last_name, phone ),
      visit_assignments!inner ( doctor_id )
    `)
    .eq('visit_assignments.doctor_id', session.userId)
    .in('status', ['waiting', 'consulting'])
    .order('checked_in_at', { ascending: true });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load assigned patient queue: {error.message}
      </div>
    );
  }

  // Format visits lists
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
      gender: (v.pets as any).gender,
    },
    customer: {
      firstName: (v.customers as any).first_name,
      lastName: (v.customers as any).last_name,
      phone: (v.customers as any).phone,
    },
  })) || [];

  const waitingVisits = visits.filter((v) => v.status === 'waiting');
  const consultingVisits = visits.filter((v) => v.status === 'consulting');

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
          <BriefcaseMedical className="w-5 h-5 text-primary-teal" />
          Attending Doctor Workspace
        </h2>
        <p className="text-xs text-graphite/70 mt-1">
          Review your active consultation room and queue assignments.
        </p>
      </div>

      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* ACTIVE / CONSULTING VISIT */}
        <div className="md:col-span-8 space-y-6">
          <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
            <div className="p-5 border-b border-border/30 bg-primary-ivory/20">
              <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-2">
                <Play className="w-4 h-4 text-primary-teal fill-current" />
                Active Consultations ({consultingVisits.length})
              </h3>
            </div>

            {consultingVisits.length > 0 ? (
              <div className="divide-y divide-border/20">
                {consultingVisits.map((v) => (
                  <div key={v.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-2">
                      <div className="flex items-center gap-2">
                        <span className="font-bold text-base text-primary-navy">{v.pet.name}</span>
                        <span className="bg-primary-teal/5 text-primary-teal text-[10px] font-bold px-2 py-0.5 rounded-full capitalize">
                          {v.pet.species} • {v.pet.gender}
                        </span>
                      </div>
                      <div className="text-xs text-graphite/70 space-y-1">
                        <p className="flex items-center gap-1">
                          <User className="w-3.5 h-3.5 text-primary-teal/60" />
                          <span>Owner: {v.customer.firstName} {v.customer.lastName}</span>
                        </p>
                        <p className="font-semibold text-primary-navy">
                          Reason: <span className="font-normal text-graphite/80">{v.reason}</span>
                        </p>
                      </div>
                    </div>

                    <div>
                      <Link
                        href={`/dashboard/doctors/${v.id}`}
                        className="bg-primary-teal hover:bg-primary-teal/95 text-white px-5 py-2.5 rounded-xl text-xs font-bold shadow-sm inline-flex items-center gap-1.5 transition-all"
                      >
                        Open Workspace
                        <ArrowRightIcon className="w-4 h-4" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-graphite/50 italic">
                No consultations currently in progress. Open a patient from the queue below to start.
              </div>
            )}
          </div>

          {/* WAITING QUEUE BOARD */}
          <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
            <div className="p-5 border-b border-border/30 bg-primary-ivory/20">
              <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-amber-500" />
                Waiting Queue ({waitingVisits.length})
              </h3>
            </div>

            {waitingVisits.length > 0 ? (
              <div className="divide-y divide-border/20">
                {waitingVisits.map((v) => (
                  <div key={v.id} className="p-6 flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
                    <div className="space-y-1.5">
                      <span className="font-bold text-sm text-primary-navy block">{v.pet.name}</span>
                      <p className="text-xs text-graphite/70">
                        Owner: {v.customer.firstName} {v.customer.lastName} • Species: {v.pet.species}
                      </p>
                      <p className="text-xs font-semibold text-primary-navy">
                        Reason: <span className="font-normal text-graphite/80">{v.reason}</span>
                      </p>
                    </div>

                    <div>
                      <Link
                        href={`/dashboard/doctors/${v.id}`}
                        className="border border-primary-teal/30 hover:bg-primary-teal/5 text-primary-teal px-4 py-2 rounded-xl text-xs font-semibold transition-all inline-flex items-center gap-1.5"
                      >
                        Start Consult
                        <Play className="w-3.5 h-3.5 fill-current" />
                      </Link>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-12 text-center text-xs text-graphite/50 italic">
                Your assigned waiting queue is empty.
              </div>
            )}
          </div>
        </div>

        {/* STATS PANEL */}
        <div className="md:col-span-4 bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-6">
          <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider">
            Workspace Summary
          </h3>

          <div className="space-y-4 text-xs">
            <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
              <span className="font-semibold text-primary-navy">Attending Doctor</span>
              <span className="font-bold text-primary-teal">
                Dr. {session.firstName} {session.lastName}
              </span>
            </div>
            <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
              <span className="font-semibold text-primary-navy">Active Consults</span>
              <span>{consultingVisits.length}</span>
            </div>
            <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
              <span className="font-semibold text-primary-navy">Waiting in Queue</span>
              <span>{waitingVisits.length}</span>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}

function ArrowRightIcon(props: any) {
  return (
    <svg {...props} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M14 5l7 7m0 0l-7 7m7-7H3" />
    </svg>
  );
}
