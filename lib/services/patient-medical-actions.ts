'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertOrganization,
  resolveServerAuthContext,
  type ServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { normalizeOneToOne } from '@/lib/supabase/embed';
import { UpdateClinicalNoteSchema } from '@/lib/validations/schemas';
import { ZodError } from 'zod';
import type { DoctorVisitRow } from '@/components/doctors/DoctorPatientHistoryClient';

type VisitAssignmentEmbed = {
  doctor_id?: string;
  user_profiles?: { first_name: string; last_name: string } | null;
};

type ClinicalNoteEmbed = {
  id: string;
  chief_complaint: string | null;
  diagnosis: string | null;
  treatment_plan: string | null;
};

export type PatientMedicalHistoryData = {
  petId: string;
  petName: string;
  species: string;
  breed: string | null;
  allergies: string | null;
  ownerName: string | null;
  visits: DoctorVisitRow[];
};

async function doctorHasRxAccess(
  supabase: Awaited<ReturnType<typeof createClient>>,
  petId: string,
  ctx: ServerAuthContext
): Promise<boolean> {
  const { data: rxAccess } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('patient_id', petId)
    .eq('doctor_id', ctx.userId)
    .eq('organization_id', ctx.organizationId)
    .limit(1)
    .maybeSingle();
  return !!rxAccess;
}

export async function assertDoctorPatientAccess(
  petId: string,
  ctx: ServerAuthContext,
  visitRows: Array<{
    doctor_id?: string | null;
    visit_assignments?: VisitAssignmentEmbed | VisitAssignmentEmbed[] | null;
  }>
): Promise<boolean> {
  if (ctx.role === 'clinic_admin') return true;
  if (ctx.role !== 'doctor') return false;

  const doctorAssignedViaVisits = visitRows.some((v) => {
    const assignment = normalizeOneToOne(v.visit_assignments);
    return assignment?.doctor_id === ctx.userId || v.doctor_id === ctx.userId;
  });

  if (doctorAssignedViaVisits) return true;
  const supabase = await createClient();
  return doctorHasRxAccess(supabase, petId, ctx);
}

function mapVisitRows(
  visitRows: Array<{
    id: string;
    reason: string | null;
    status: string;
    checked_in_at: string | null;
    visit_assignments?: VisitAssignmentEmbed | VisitAssignmentEmbed[] | null;
    clinical_notes?:
      | ClinicalNoteEmbed
      | ClinicalNoteEmbed[]
      | null;
    documents?: DoctorVisitRow['documents'];
  }>
): DoctorVisitRow[] {
  return visitRows.map((v) => {
    const assignment = normalizeOneToOne(v.visit_assignments);
    const prof = assignment?.user_profiles ?? null;
    const rawNotes = normalizeOneToOne(v.clinical_notes);
    const notes = rawNotes
      ? {
          id: rawNotes.id,
          chief_complaint: rawNotes.chief_complaint,
          diagnosis: rawNotes.diagnosis,
          treatment_plan: rawNotes.treatment_plan,
        }
      : null;
    return {
      id: v.id,
      reason: v.reason,
      status: v.status,
      checked_in_at: v.checked_in_at,
      doctorName: prof ? `Dr. ${prof.first_name} ${prof.last_name}` : null,
      notes,
      documents: (v.documents as DoctorVisitRow['documents']) ?? [],
    };
  });
}

export async function getDoctorPatientMedicalHistoryAction(petId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized: Session is invalid.' };
    }
    assertOrganization(ctx);

    const supabase = await createClient();

    const { data: pet, error: petError } = await supabase
      .from('patients')
      .select(`
        id, name, species, breed, allergies,
        customers ( first_name, last_name )
      `)
      .eq('id', petId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (petError || !pet) {
      return { success: false as const, error: 'Patient not found or access denied.' };
    }

    const { data: visitRows } = await supabase
      .from('visits')
      .select(`
        id, reason, status, checked_in_at, doctor_id,
        visit_assignments ( doctor_id, user_profiles ( first_name, last_name ) ),
        clinical_notes ( id, chief_complaint, diagnosis, treatment_plan ),
        documents ( id, file_name, category, created_at )
      `)
      .eq('patient_id', petId)
      .eq('organization_id', ctx.organizationId)
      .order('checked_in_at', { ascending: false });

    const hasAccess = await assertDoctorPatientAccess(petId, ctx, visitRows ?? []);
    if (!hasAccess && ctx.role === 'doctor') {
      return {
        success: false as const,
        error: 'You can only view medical history for patients assigned to you.',
      };
    }

    const customer = pet.customers as { first_name: string; last_name: string } | null;

    return {
      success: true as const,
      data: {
        petId: pet.id,
        petName: pet.name,
        species: pet.species,
        breed: pet.breed,
        allergies: pet.allergies,
        ownerName: customer ? `${customer.first_name} ${customer.last_name}` : null,
        visits: mapVisitRows(visitRows ?? []),
      } satisfies PatientMedicalHistoryData,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load medical history.';
    return { success: false as const, error: message };
  }
}

async function canEditVisitClinicalNote(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  petId: string,
  ctx: ServerAuthContext
): Promise<boolean> {
  if (ctx.role === 'clinic_admin') return true;
  if (ctx.role !== 'doctor') return false;

  const { data: visit } = await supabase
    .from('visits')
    .select('doctor_id, visit_assignments ( doctor_id )')
    .eq('id', visitId)
    .eq('patient_id', petId)
    .eq('organization_id', ctx.organizationId)
    .single();

  if (!visit) return false;

  const assignment = normalizeOneToOne(
    visit.visit_assignments as VisitAssignmentEmbed | VisitAssignmentEmbed[] | null
  );
  if (assignment?.doctor_id === ctx.userId || visit.doctor_id === ctx.userId) {
    return true;
  }

  return doctorHasRxAccess(supabase, petId, ctx);
}

export async function updateClinicalNoteAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized: Session is invalid.' };
    }
    assertOrganization(ctx);

    const parsed = UpdateClinicalNoteSchema.parse(payload);
    const supabase = await createClient();

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('id, branch_id, patient_id, organization_id')
      .eq('id', parsed.visitId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (visitError || !visit) {
      return { success: false as const, error: 'Visit record not found or access denied.' };
    }

    const canEdit = await canEditVisitClinicalNote(
      supabase,
      parsed.visitId,
      visit.patient_id,
      ctx
    );
    if (!canEdit) {
      return {
        success: false as const,
        error: 'You can only edit clinical notes for visits you are assigned to.',
      };
    }

    const notePayload = {
      chief_complaint: parsed.chiefComplaint,
      diagnosis: parsed.diagnosis,
      treatment_plan: parsed.treatmentPlan || null,
    };

    const { data: existingNotes } = await supabase
      .from('clinical_notes')
      .select('id')
      .eq('visit_id', parsed.visitId)
      .maybeSingle();

    const isUpdate = Boolean(existingNotes);
    const notesResult = existingNotes
      ? await supabase
          .from('clinical_notes')
          .update(notePayload)
          .eq('id', existingNotes.id)
          .select('id')
          .single()
      : await supabase
          .from('clinical_notes')
          .insert({
            visit_id: parsed.visitId,
            ...notePayload,
            created_by: ctx.userId,
          })
          .select('id')
          .single();

    if (notesResult.error) {
      return {
        success: false as const,
        error: notesResult.error.message || 'Failed to save clinical notes.',
      };
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: isUpdate ? 'CLINICAL_NOTE_UPDATED' : 'CLINICAL_NOTE_CREATED',
      resourceType: 'CLINICAL_NOTE',
      resourceId: notesResult.data?.id,
      afterData: { visit_id: parsed.visitId, diagnosis: parsed.diagnosis },
    });

    return { success: true as const };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      const first = err.issues[0];
      return { success: false as const, error: first?.message || 'Invalid input.' };
    }
    const message = err instanceof Error ? err.message : 'Failed to update clinical note.';
    return { success: false as const, error: message };
  }
}
