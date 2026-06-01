import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { 
  Heart, 
  ArrowLeft, 
  User, 
  Calendar, 
  Weight, 
  AlertTriangle,
  Stethoscope,
  ClipboardList,
  FileText,
  FileCheck2
} from 'lucide-react';

export const metadata = {
  title: 'VetFlow Patient Medical File',
  description: 'Review patient bios, clinical notes, and prescriptions.',
};

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: petId } = await params;
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();

  // 1. Fetch pet details with customer info
  const { data: pet, error: petError } = await supabase
    .from('pets')
    .select(`
      *,
      customers (
        id,
        first_name,
        last_name,
        phone,
        email
      )
    `)
    .eq('id', petId)
    .eq('organization_id', session.organizationId)
    .single();

  if (petError || !pet) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Patient profile not found or access denied.
      </div>
    );
  }

  // 2. Fetch all medical visits (consultations) with clinical notes and prescriptions
  const { data: visits, error: visitsError } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      checked_in_at,
      completed_at,
      visit_assignments (
        doctor_id,
        user_profiles ( first_name, last_name )
      ),
      clinical_notes (
        chief_complaint,
        history,
        examination_findings,
        diagnosis,
        treatment_plan,
        follow_up_recommendation
      ),
      prescriptions (
        id,
        is_finalized,
        prescription_items (
          medicine_name,
          dosage,
          frequency,
          duration,
          instructions
        )
      )
    `)
    .eq('pet_id', petId)
    .order('checked_in_at', { ascending: false });

  return (
    <div className="space-y-8">
      
      {/* BACK BUTTON AND TITLE */}
      <div className="space-y-2">
        <Link 
          href={`/dashboard/customers/${pet.customer_id}`} 
          className="inline-flex items-center gap-1.5 text-xs text-graphite/60 hover:text-primary-teal font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Owner Profile
        </Link>
        
        <div>
          <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
            <Heart className="w-5 h-5 text-primary-teal" />
            Medical File: {pet.name}
          </h2>
          <p className="text-xs text-graphite/70 mt-1">
            Clinical charting history and diagnostics for this patient.
          </p>
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* BIOLOGICAL BRIEF CARD */}
        <div className="md:col-span-1 space-y-6">
          <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-6">
            <div>
              <span className="text-[10px] font-bold text-primary-teal uppercase tracking-wider block mb-1">
                Patient Biology
              </span>
              <h3 className="text-lg font-bold text-primary-navy">{pet.name}</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
                <span className="font-semibold text-primary-navy">Species</span>
                <span className="capitalize">{pet.species}</span>
              </div>
              {pet.breed && (
                <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
                  <span className="font-semibold text-primary-navy">Breed</span>
                  <span>{pet.breed}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
                <span className="font-semibold text-primary-navy">Gender</span>
                <span>{pet.gender}</span>
              </div>
              {pet.date_of_birth && (
                <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
                  <span className="font-semibold text-primary-navy">DOB</span>
                  <span>{pet.date_of_birth}</span>
                </div>
              )}
              {pet.weight_kg && (
                <div className="flex items-center justify-between text-graphite/70 border-b border-border/30 pb-2">
                  <span className="font-semibold text-primary-navy">Current Weight</span>
                  <span>{pet.weight_kg} kg</span>
                </div>
              )}
            </div>

            {/* Allergies Alert Box */}
            {pet.allergies && pet.allergies !== 'None' ? (
              <div className="p-4 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block">ALLERGY WARNING:</span>
                  <p className="mt-0.5 font-medium">{pet.allergies}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/5 border border-emerald-500/10 text-emerald-700 text-xs rounded-xl flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="font-semibold">No Known Allergies</span>
              </div>
            )}
          </div>

          {/* Owner details block */}
          {pet.customers && (
            <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-4">
              <span className="text-[10px] font-bold text-graphite/40 uppercase tracking-wider block">
                Primary Contact
              </span>
              <div className="text-xs">
                <Link 
                  href={`/dashboard/customers/${pet.customers.id}`}
                  className="font-bold text-primary-navy hover:text-primary-teal hover:underline block mb-2"
                >
                  {pet.customers.first_name} {pet.customers.last_name}
                </Link>
                <div className="space-y-1.5 text-graphite/70">
                  <p>{pet.customers.phone}</p>
                  {pet.customers.email && <p className="truncate">{pet.customers.email}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CLINICAL VISITS RECORD */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider">
            Clinical Visit History ({visits?.length || 0})
          </h3>

          {visits && visits.length > 0 ? (
            <div className="space-y-6">
              {visits.map((visit) => {
                const docAssignment = visit.visit_assignments?.[0];
                const notes = visit.clinical_notes?.[0];
                const prescription = visit.prescriptions?.[0];

                return (
                  <div 
                    key={visit.id} 
                    className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-6 relative overflow-hidden"
                  >
                    {/* Status accent strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      visit.status === 'completed' ? 'bg-primary-teal' : 'bg-amber-500'
                    }`}></div>

                    {/* Visit Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-border/30 pb-4">
                      <div>
                        <span className="text-[10px] font-bold text-graphite/40 uppercase tracking-wider block">
                          Consultation date
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-primary-teal" />
                          <span className="text-xs font-bold text-primary-navy">
                            {new Date(visit.checked_in_at).toLocaleDateString(undefined, {
                              year: 'numeric',
                              month: 'long',
                              day: 'numeric',
                              hour: '2-digit',
                              minute: '2-digit',
                            })}
                          </span>
                        </div>
                      </div>

                      <div className="text-xs sm:text-right">
                        <span className="text-[10px] font-bold text-graphite/40 uppercase tracking-wider block">
                          Attending Doctor
                        </span>
                        <span className="font-bold text-primary-navy">
                          {docAssignment 
                            ? `Dr. ${(docAssignment.user_profiles as any).first_name} ${(docAssignment.user_profiles as any).last_name}`
                            : 'Unassigned'}
                        </span>
                      </div>
                    </div>

                    {/* Chief Complaint */}
                    <div>
                      <span className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block mb-1">
                        Reason for Visit
                      </span>
                      <p className="text-xs text-graphite/85 bg-primary-ivory/20 p-3 rounded-xl border border-border/25">
                        {visit.reason}
                      </p>
                    </div>

                    {/* Clinical Notes (Only if consultation has finished / notes exist) */}
                    {notes && (
                      <div className="grid sm:grid-cols-2 gap-6 pt-2">
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block mb-1">
                              Clinical Findings
                            </span>
                            <p className="text-xs text-graphite/80 leading-relaxed whitespace-pre-line">
                              {notes.examination_findings || '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block mb-1">
                              Diagnosis
                            </span>
                            <p className="text-xs font-bold text-primary-navy leading-relaxed bg-emerald-500/5 text-emerald-800 p-2 border border-emerald-500/10 rounded-lg">
                              {notes.diagnosis}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold text-primary-navy uppercase tracking-wider block mb-1">
                              Treatment Plan
                            </span>
                            <p className="text-xs text-graphite/80 leading-relaxed whitespace-pre-line">
                              {notes.treatment_plan || '—'}
                            </p>
                          </div>
                          {notes.follow_up_recommendation && (
                            <div className="p-2.5 bg-primary-ivory border border-border/60 rounded-xl">
                              <span className="text-[9px] font-bold text-primary-navy uppercase tracking-wider block">
                                Follow-up Recommendation
                              </span>
                              <span className="text-[11px] text-graphite/70 mt-1 block">
                                {notes.follow_up_recommendation}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Prescription details */}
                    {prescription && (
                      <div className="border-t border-border/30 pt-4 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-primary-teal" />
                          <span className="text-[10px] font-black text-primary-navy uppercase tracking-wider">
                            Issued Prescription
                          </span>
                        </div>
                        
                        {prescription.prescription_items && prescription.prescription_items.length > 0 ? (
                          <div className="bg-primary-ivory/20 rounded-xl border border-border/40 overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-primary-ivory/40 border-b border-border/40 text-[9px] font-bold text-primary-navy/80 uppercase">
                                  <th className="px-4 py-2">Medicine</th>
                                  <th className="px-4 py-2">Dosage</th>
                                  <th className="px-4 py-2">Frequency</th>
                                  <th className="px-4 py-2">Duration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-border/20 text-[11px] text-graphite/85">
                                {(prescription.prescription_items as any[]).map((item, idx) => (
                                  <tr key={idx}>
                                    <td className="px-4 py-2 font-semibold text-primary-navy">{item.medicine_name}</td>
                                    <td className="px-4 py-2">{item.dosage}</td>
                                    <td className="px-4 py-2">{item.frequency}</td>
                                    <td className="px-4 py-2">{item.duration}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[10px] text-graphite/40 italic pl-5">Prescription empty or no items added.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="bg-white rounded-2xl border border-border/40 p-12 text-center">
              <ClipboardList className="w-12 h-12 text-graphite/30 mx-auto mb-4" />
              <h4 className="text-xs font-bold text-primary-navy mb-1">No Consultations Found</h4>
              <p className="text-[10px] text-graphite/60">No medical visits have been logged for this patient yet.</p>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}

// Inline fallback icon for convenience
function CheckCircleIcon({ className }: { className?: string }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12l2 2 4-4m6 2a9 9 0 11-18 0 9 9 0 0118 0z" />
    </svg>
  );
}
