import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import { normalizeOneToOne } from '@/lib/supabase/embed';
import PageHeader from '@/components/ui/premium/PageHeader';
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
import MedicalRecordActivityPanel, {
  type MedicalActivityRow,
} from '@/components/dashboard/MedicalRecordActivityPanel';
import PatientDocumentsClient from '@/components/pets/PatientDocumentsClient';

export const metadata = {
  title: 'Patient Medical File',
  description: 'Review patient bios, clinical notes, and prescriptions.',
};

type ProfileName = { first_name: string | null; last_name: string | null };

function formatDoctorName(profile: ProfileName | null | undefined): string | null {
  if (!profile?.first_name && !profile?.last_name) return null;
  return `Dr. ${profile.first_name || ''} ${profile.last_name || ''}`.trim();
}

type ClinicalNoteEmbed = {
  temperature_c?: number | null;
  heart_rate_bpm?: number | null;
  respiratory_rate?: number | null;
  weight_kg?: number | null;
  examination_findings?: string | null;
  diagnosis?: string | null;
  treatment_plan?: string | null;
  follow_up_recommendation?: string | null;
};

type PrescriptionItemEmbed = {
  medicine_name?: string;
  dosage?: string;
  frequency?: string;
  duration?: string;
};

type PrescriptionEmbed = {
  id?: string;
  prescription_items?: PrescriptionItemEmbed[];
};

function resolveAttendingDoctor(visit: {
  doctor_id?: string | null;
  visit_assignments?: unknown;
  prescriptions?: unknown;
}): string {
  const assignment = normalizeOneToOne(
    visit.visit_assignments as
      | { user_profiles?: ProfileName | ProfileName[] | null }
      | { user_profiles?: ProfileName | ProfileName[] | null }[]
      | null
  );
  const assignmentProfile = normalizeOneToOne(
    assignment?.user_profiles as ProfileName | ProfileName[] | null
  );
  const fromAssignment = formatDoctorName(assignmentProfile);
  if (fromAssignment) return fromAssignment;

  const rx = normalizeOneToOne(
    visit.prescriptions as
      | { user_profiles?: ProfileName | ProfileName[] | null }
      | { user_profiles?: ProfileName | ProfileName[] | null }[]
      | null
  );
  const rxProfile = normalizeOneToOne(rx?.user_profiles as ProfileName | ProfileName[] | null);
  const fromRx = formatDoctorName(rxProfile);
  if (fromRx) return fromRx;

  return 'Unassigned';
}

export default async function PetDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id: petId } = await params;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/pets');
  if (denied) return denied;

  const session = ctx;

  const supabase = await createClient();

  // 1. Fetch pet details with customer info
  const { data: pet, error: petError } = await supabase
    .from('patients')
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

  const visitIdsForPet: string[] = [];

  // 2. Fetch all medical visits (consultations) with clinical notes and prescriptions
  const { data: visits, error: visitsError } = await supabase
    .from('visits')
    .select(`
      id,
      reason,
      status,
      checked_in_at,
      completed_at,
      doctor_id,
      is_emergency,
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
        follow_up_recommendation,
        temperature_c,
        heart_rate_bpm,
        respiratory_rate,
        weight_kg
      ),
      prescriptions (
        id,
        is_finalized,
        doctor_id,
        user_profiles ( first_name, last_name ),
        prescription_items (
          medicine_name,
          dosage,
          frequency,
          duration,
          instructions
        )
      )
    `)
    .eq('patient_id', petId)
    .order('checked_in_at', { ascending: false });

  for (const v of visits || []) {
    visitIdsForPet.push(v.id);
  }

  let petMedicalActivity: MedicalActivityRow[] = [];
  if (visitIdsForPet.length > 0) {
    const { data: logs } = await supabase
      .from('audit_logs')
      .select('id, action, resource_type, created_at, actor_user_id, actor_role, after_data, resource_id')
      .eq('organization_id', session.organizationId)
      .in('action', [
        'CLINICAL_NOTE_CREATED',
        'CLINICAL_NOTE_UPDATED',
        'PRESCRIPTION_CREATED',
        'DOCUMENT_UPLOADED',
        'LAB_ORDER_CREATED',
        'LAB_ORDER_UPDATED',
      ])
      .order('created_at', { ascending: false })
      .limit(20);

    const relevant = (logs || []).filter(
      (l) => l.resource_id && visitIdsForPet.includes(l.resource_id)
    );

    const actorIds = [...new Set(relevant.map((l) => l.actor_user_id).filter(Boolean))] as string[];
    const actorMap = new Map<string, string>();
    if (actorIds.length > 0) {
      const { data: actors } = await supabase
        .from('user_profiles')
        .select('id, first_name, last_name')
        .in('id', actorIds);
      for (const a of actors || []) {
        actorMap.set(a.id, `${a.first_name} ${a.last_name}`.trim());
      }
    }

    petMedicalActivity = relevant.slice(0, 10).map((log) => {
      const after = log.after_data as Record<string, unknown> | null;
      let summary = log.resource_type;
      if (after?.diagnosis) summary = String(after.diagnosis);
      return {
        id: log.id,
        action: log.action,
        actorName: actorMap.get(log.actor_user_id) || 'Staff',
        actorRole: log.actor_role || 'staff',
        resourceType: log.resource_type,
        createdAt: log.created_at,
        summary,
      };
    });
  }

  const { data: patientDocuments } = await supabase
    .from('documents')
    .select('id, file_name, category, created_at, mime_type, storage_path')
    .eq('patient_id', petId)
    .eq('organization_id', session.organizationId)
    .is('deleted_at', null)
    .order('created_at', { ascending: false });

  return (
    <div className="space-y-8">
      
      <Link
        href={`/dashboard/customers/${pet.customer_id}`}
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Owner Profile
      </Link>

      <PageHeader
        title={`Medical File: ${pet.name}`}
        description="Clinical charting history and diagnostics for this patient."
        icon={Heart}
      />

      {petMedicalActivity.length > 0 && (
        <MedicalRecordActivityPanel activities={petMedicalActivity} />
      )}

      {patientDocuments && patientDocuments.length > 0 && (
        <PatientDocumentsClient
          documents={patientDocuments}
          canDelete={session.role === 'clinic_admin'}
        />
      )}

      <div className="grid md:grid-cols-3 gap-8">
        
        {/* BIOLOGICAL BRIEF CARD */}
        <div className="md:col-span-1 space-y-6">
          <div className="glass-panel p-6 space-y-6">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
                Patient Biology
              </span>
              <h3 className="text-lg font-bold text-on-surface">{pet.name}</h3>
            </div>

            <div className="space-y-4 text-xs">
              <div className="flex items-center justify-between text-on-surface-variant/70 border-b border-outline-variant/30 pb-2">
                <span className="font-semibold text-on-surface">Species</span>
                <span className="capitalize">{pet.species}</span>
              </div>
              {pet.breed && (
                <div className="flex items-center justify-between text-on-surface-variant/70 border-b border-outline-variant/30 pb-2">
                  <span className="font-semibold text-on-surface">Breed</span>
                  <span>{pet.breed}</span>
                </div>
              )}
              <div className="flex items-center justify-between text-on-surface-variant/70 border-b border-outline-variant/30 pb-2">
                <span className="font-semibold text-on-surface">Gender</span>
                <span>{pet.gender}</span>
              </div>
              {pet.date_of_birth && (
                <div className="flex items-center justify-between text-on-surface-variant/70 border-b border-outline-variant/30 pb-2">
                  <span className="font-semibold text-on-surface">DOB</span>
                  <span>{pet.date_of_birth}</span>
                </div>
              )}
              {pet.weight_kg && (
                <div className="flex items-center justify-between text-on-surface-variant/70 border-b border-outline-variant/30 pb-2">
                  <span className="font-semibold text-on-surface">Current Weight</span>
                  <span>{pet.weight_kg} kg</span>
                </div>
              )}
            </div>

            {/* Allergies Alert Box */}
            {pet.allergies && pet.allergies !== 'None' ? (
              <div className="p-4 bg-destructive/10 border border-destructive/20 text-destructive text-xs rounded-xl flex items-start gap-2">
                <AlertTriangle className="w-4 h-4 mt-0.5 flex-shrink-0" />
                <div>
                  <span className="font-bold block">ALLERGY WARNING:</span>
                  <p className="mt-0.5 font-medium">{pet.allergies}</p>
                </div>
              </div>
            ) : (
              <div className="p-4 bg-emerald-500/10 border border-emerald-500/20 text-emerald-400 text-xs rounded-xl flex items-center gap-2">
                <CheckCircleIcon className="w-4 h-4" />
                <span className="font-semibold">No Known Allergies</span>
              </div>
            )}
          </div>

          {/* Owner details block */}
          {pet.customers && (
            <div className="glass-panel p-6 space-y-4">
              <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider block">
                Primary Contact
              </span>
              <div className="text-xs">
                <Link 
                  href={`/dashboard/customers/${pet.customers.id}`}
                  className="font-bold text-on-surface hover:text-primary hover:underline block mb-2"
                >
                  {pet.customers.first_name} {pet.customers.last_name}
                </Link>
                <div className="space-y-1.5 text-on-surface-variant/70">
                  <p>{pet.customers.phone}</p>
                  {pet.customers.email && <p className="truncate">{pet.customers.email}</p>}
                </div>
              </div>
            </div>
          )}
        </div>

        {/* CLINICAL VISITS RECORD */}
        <div className="md:col-span-2 space-y-6">
          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
            Clinical Visit History ({visits?.length || 0})
          </h3>

          {visits && visits.length > 0 ? (
            <div className="space-y-6">
              {visits.map((visit) => {
                const attendingDoctor = resolveAttendingDoctor(visit);
                const notes = normalizeOneToOne(
                  visit.clinical_notes as ClinicalNoteEmbed | ClinicalNoteEmbed[] | null
                );
                const prescription = normalizeOneToOne(
                  visit.prescriptions as PrescriptionEmbed | PrescriptionEmbed[] | null
                );

                return (
                  <div 
                    key={visit.id} 
                    className="glass-panel p-6 space-y-6 relative overflow-hidden"
                  >
                    {/* Status accent strip */}
                    <div className={`absolute left-0 top-0 bottom-0 w-1.5 ${
                      visit.status === 'completed' ? 'bg-primary' : 'bg-amber-500'
                    }`}></div>

                    {/* Visit Header */}
                    <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-2 border-b border-outline-variant/30 pb-4">
                      <div>
                        <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider block">
                          Consultation date
                        </span>
                        <div className="flex items-center gap-2 mt-0.5">
                          <Calendar className="w-3.5 h-3.5 text-primary" />
                          <span className="text-xs font-bold text-on-surface">
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
                        <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase tracking-wider block">
                          Attending Doctor
                        </span>
                        <span className="font-bold text-on-surface flex items-center gap-2 justify-end">
                          <Stethoscope className="w-3.5 h-3.5 text-primary shrink-0" />
                          {attendingDoctor}
                          {visit.is_emergency && (
                            <span className="text-[9px] font-bold text-destructive flex items-center gap-0.5">
                              <AlertTriangle className="w-3 h-3" />
                              EMERGENCY
                            </span>
                          )}
                        </span>
                      </div>
                    </div>

                    {/* Chief Complaint */}
                    <div>
                      <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider block mb-1">
                        Reason for Visit
                      </span>
                      <p className="text-xs text-on-surface-variant bg-surface-container-high/40 p-3 rounded-xl border border-outline-variant/40">
                        {visit.reason}
                      </p>
                    </div>

                    {/* Clinical Notes (Only if consultation has finished / notes exist) */}
                    {notes && (
                      <div className="grid sm:grid-cols-2 gap-6 pt-2">
                        {(notes.temperature_c != null ||
                          notes.heart_rate_bpm != null ||
                          notes.respiratory_rate != null ||
                          notes.weight_kg != null) && (
                          <div className="sm:col-span-2 flex flex-wrap gap-3 p-3 rounded-xl bg-surface-container/30 border border-outline-variant/30 text-[10px]">
                            {notes.temperature_c != null && (
                              <span>
                                <strong>Temp:</strong> {notes.temperature_c}°C
                              </span>
                            )}
                            {notes.heart_rate_bpm != null && (
                              <span>
                                <strong>HR:</strong> {notes.heart_rate_bpm} bpm
                              </span>
                            )}
                            {notes.respiratory_rate != null && (
                              <span>
                                <strong>RR:</strong> {notes.respiratory_rate}/min
                              </span>
                            )}
                            {notes.weight_kg != null && (
                              <span>
                                <strong>Weight:</strong> {notes.weight_kg} kg
                              </span>
                            )}
                          </div>
                        )}
                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider block mb-1">
                              Clinical Findings
                            </span>
                            <p className="text-xs text-on-surface-variant/80 leading-relaxed whitespace-pre-line">
                              {notes.examination_findings || '—'}
                            </p>
                          </div>
                          <div>
                            <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider block mb-1">
                              Diagnosis
                            </span>
                            <p className="text-xs font-bold text-emerald-400 leading-relaxed bg-emerald-500/10 p-2 border border-emerald-500/20 rounded-lg">
                              {notes.diagnosis}
                            </p>
                          </div>
                        </div>

                        <div className="space-y-3">
                          <div>
                            <span className="text-[10px] font-bold text-on-surface uppercase tracking-wider block mb-1">
                              Treatment Plan
                            </span>
                            <p className="text-xs text-on-surface-variant/80 leading-relaxed whitespace-pre-line">
                              {notes.treatment_plan || '—'}
                            </p>
                          </div>
                          {notes.follow_up_recommendation && (
                            <div className="p-2.5 bg-surface-container-high/40 border border-outline-variant/40 rounded-xl">
                              <span className="text-[9px] font-bold text-on-surface uppercase tracking-wider block">
                                Follow-up Recommendation
                              </span>
                              <span className="text-[11px] text-on-surface-variant/70 mt-1 block">
                                {notes.follow_up_recommendation}
                              </span>
                            </div>
                          )}
                        </div>
                      </div>
                    )}

                    {/* Prescription details */}
                    {prescription && (
                      <div className="border-t border-outline-variant/30 pt-4 space-y-3">
                        <div className="flex items-center gap-1.5">
                          <FileCheck2 className="w-4 h-4 text-primary" />
                          <span className="text-[10px] font-black text-on-surface uppercase tracking-wider">
                            Issued Prescription
                          </span>
                        </div>
                        
                        {prescription.prescription_items && prescription.prescription_items.length > 0 ? (
                          <div className="bg-surface-container-high/40 rounded-xl border border-outline-variant/40 overflow-hidden">
                            <table className="w-full text-left text-xs border-collapse">
                              <thead>
                                <tr className="bg-surface-container/50 border-b border-outline-variant/40 text-[9px] font-bold text-on-surface uppercase">
                                  <th className="px-4 py-2">Medicine</th>
                                  <th className="px-4 py-2">Dosage</th>
                                  <th className="px-4 py-2">Frequency</th>
                                  <th className="px-4 py-2">Duration</th>
                                </tr>
                              </thead>
                              <tbody className="divide-y divide-outline-variant/20 text-[11px] text-on-surface-variant">
                                {(prescription.prescription_items as any[]).map((item, idx) => (
                                  <tr key={idx} className="hover:bg-surface-container-high/10">
                                    <td className="px-4 py-2 font-semibold text-on-surface">{item.medicine_name}</td>
                                    <td className="px-4 py-2">{item.dosage}</td>
                                    <td className="px-4 py-2">{item.frequency}</td>
                                    <td className="px-4 py-2">{item.duration}</td>
                                  </tr>
                                ))}
                              </tbody>
                            </table>
                          </div>
                        ) : (
                          <p className="text-[10px] text-on-surface-variant/40 italic pl-5">Prescription empty or no items added.</p>
                        )}
                      </div>
                    )}
                  </div>
                );
              })}
            </div>
          ) : (
            <div className="glass-panel p-12 text-center">
              <ClipboardList className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
              <h4 className="text-xs font-bold text-on-surface mb-1">No Consultations Found</h4>
              <p className="text-[10px] text-on-surface-variant/60">No medical visits have been logged for this patient yet.</p>
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
