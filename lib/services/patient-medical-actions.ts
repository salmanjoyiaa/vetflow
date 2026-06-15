'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertOrganization,
  resolveServerAuthContext,
  type ServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { normalizeOneToOne } from '@/lib/supabase/embed';
import {
  UpdateClinicalNoteSchema,
  UpdatePatientCareNotesSchema,
} from '@/lib/validations/schemas';
import { ZodError } from 'zod';
import type {
  ClinicalNoteRow,
  InvoiceRow,
  LabOrderRow,
  PatientDocumentRow,
  PatientMedicalProfileData,
  PatientVisitRow,
  PrescriptionItemRow,
  VisitPrescriptionRow,
} from '@/lib/types/patient-medical';
import type { MedicalActivityRow } from '@/components/dashboard/MedicalRecordActivityPanel';

const DOCUMENTS_BUCKET = 'clinic-documents';
const MAX_PHOTO_BYTES = 8 * 1024 * 1024;
const PHOTO_MIME = new Set(['image/png', 'image/jpeg', 'image/webp', 'image/heic']);
const PHOTO_EXTENSIONS = new Set(['.png', '.jpg', '.jpeg', '.webp', '.heic']);

type VisitAssignmentEmbed = {
  doctor_id?: string;
  user_profiles?: { first_name: string; last_name: string } | null;
};

type ProfileName = { first_name: string | null; last_name: string | null };

function formatZodError(err: ZodError): string {
  return err.issues[0]?.message || 'Invalid input.';
}

function formatDoctorName(profile: ProfileName | null | undefined): string | null {
  if (!profile?.first_name && !profile?.last_name) return null;
  return `Dr. ${profile.first_name || ''} ${profile.last_name || ''}`.trim();
}

function numOrNull(v: number | undefined): number | null {
  return v !== undefined && !Number.isNaN(v) ? v : null;
}

function sanitizeFileName(name: string): string {
  return name.replace(/[^a-zA-Z0-9._-]/g, '_').slice(0, 120);
}

function fileExtension(name: string): string {
  const dot = name.lastIndexOf('.');
  return dot >= 0 ? name.slice(dot).toLowerCase() : '';
}

function isPhotoFile(file: File): boolean {
  if (file.type && PHOTO_MIME.has(file.type)) return true;
  return PHOTO_EXTENSIONS.has(fileExtension(file.name));
}

function resolveAttendingDoctor(visit: {
  doctor_id?: string | null;
  visit_assignments?: unknown;
  prescriptions?: unknown;
}): string | null {
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
  return formatDoctorName(rxProfile);
}

function mapClinicalNote(raw: Record<string, unknown> | null): ClinicalNoteRow | null {
  if (!raw || !raw.id) return null;
  return {
    id: String(raw.id),
    visit_type: (raw.visit_type as string) ?? null,
    chief_complaint: (raw.chief_complaint as string) ?? null,
    history: (raw.history as string) ?? null,
    examination_findings: (raw.examination_findings as string) ?? null,
    diagnosis: (raw.diagnosis as string) ?? null,
    treatment_plan: (raw.treatment_plan as string) ?? null,
    procedure_notes: (raw.procedure_notes as string) ?? null,
    post_op_medication: (raw.post_op_medication as string) ?? null,
    internal_notes: (raw.internal_notes as string) ?? null,
    follow_up_recommendation: (raw.follow_up_recommendation as string) ?? null,
    follow_up_days: (raw.follow_up_days as number[] | null) ?? null,
    temperature_c: (raw.temperature_c as number) ?? null,
    heart_rate_bpm: (raw.heart_rate_bpm as number) ?? null,
    respiratory_rate: (raw.respiratory_rate as number) ?? null,
    weight_kg: (raw.weight_kg as number) ?? null,
  };
}

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

function canUploadPhoto(ctx: ServerAuthContext): boolean {
  return (
    ctx.role === 'doctor' || ctx.role === 'receptionist' || ctx.role === 'clinic_admin'
  );
}

function canEditCareNotes(ctx: ServerAuthContext): boolean {
  return (
    ctx.role === 'doctor' || ctx.role === 'receptionist' || ctx.role === 'clinic_admin'
  );
}

async function fetchActivities(
  supabase: Awaited<ReturnType<typeof createClient>>,
  organizationId: string,
  visitIds: string[]
): Promise<MedicalActivityRow[]> {
  if (visitIds.length === 0) return [];

  const { data: logs } = await supabase
    .from('audit_logs')
    .select(
      'id, action, resource_type, created_at, actor_user_id, actor_role, after_data, resource_id'
    )
    .eq('organization_id', organizationId)
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

  const relevant = (logs ?? []).filter(
    (l) => l.resource_id && visitIds.includes(l.resource_id)
  );

  const actorIds = [...new Set(relevant.map((l) => l.actor_user_id).filter(Boolean))] as string[];
  const actorMap = new Map<string, string>();
  if (actorIds.length > 0) {
    const { data: actors } = await supabase
      .from('user_profiles')
      .select('id, first_name, last_name')
      .in('id', actorIds);
    for (const a of actors ?? []) {
      actorMap.set(a.id, `${a.first_name} ${a.last_name}`.trim());
    }
  }

  return relevant.slice(0, 10).map((log) => {
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

export async function getPatientMedicalProfileAction(petId: string) {
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
        id, name, species, breed, gender, date_of_birth, weight_kg,
        allergies, medical_notes, patient_number,
        customers ( id, first_name, last_name, phone, email )
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
        id, reason, status, checked_in_at, completed_at, doctor_id, is_emergency,
        visit_assignments ( doctor_id, user_profiles ( first_name, last_name ) ),
        clinical_notes (
          id, visit_type, chief_complaint, history, examination_findings, diagnosis,
          treatment_plan, procedure_notes, post_op_medication, internal_notes,
          follow_up_recommendation, follow_up_days,
          temperature_c, heart_rate_bpm, respiratory_rate, weight_kg
        ),
        prescriptions (
          id, is_finalized,
          user_profiles ( first_name, last_name ),
          prescription_items (
            medicine_name, dosage, frequency, duration, instructions
          )
        ),
        documents ( id, file_name, category, created_at, mime_type )
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

    const visitIds = (visitRows ?? []).map((v) => v.id);

    const [{ data: labOrders }, { data: invoices }, { data: allDocs }, { data: profilePhoto }] =
      await Promise.all([
        supabase
          .from('lab_orders')
          .select('id, visit_id, test_name, status, result_text, result_document_id, created_at')
          .eq('patient_id', petId)
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('invoices')
          .select('id, invoice_number, total, payment_status, created_at, visit_id')
          .eq('patient_id', petId)
          .eq('organization_id', ctx.organizationId)
          .order('created_at', { ascending: false }),
        supabase
          .from('documents')
          .select('id, file_name, category, created_at, mime_type')
          .eq('patient_id', petId)
          .eq('organization_id', ctx.organizationId)
          .is('deleted_at', null)
          .neq('category', 'profile_photo')
          .order('created_at', { ascending: false }),
        supabase
          .from('documents')
          .select('id')
          .eq('patient_id', petId)
          .eq('organization_id', ctx.organizationId)
          .eq('category', 'profile_photo')
          .is('deleted_at', null)
          .order('created_at', { ascending: false })
          .limit(1)
          .maybeSingle(),
      ]);

    const labsByVisit = new Map<string, LabOrderRow[]>();
    for (const lab of labOrders ?? []) {
      const row: LabOrderRow = {
        id: lab.id,
        visit_id: lab.visit_id,
        test_name: lab.test_name,
        status: lab.status,
        result_text: lab.result_text,
        result_document_id: lab.result_document_id,
        created_at: lab.created_at,
      };
      const list = labsByVisit.get(lab.visit_id) ?? [];
      list.push(row);
      labsByVisit.set(lab.visit_id, list);
    }

    const visits: PatientVisitRow[] = (visitRows ?? []).map((v) => {
      const rawNotes = normalizeOneToOne(
        v.clinical_notes as Record<string, unknown> | Record<string, unknown>[] | null
      );
      const rawRx = normalizeOneToOne(
        v.prescriptions as
          | {
              id: string;
              is_finalized: boolean;
              prescription_items?: PrescriptionItemRow[] | PrescriptionItemRow[] | null;
            }
          | {
              id: string;
              is_finalized: boolean;
              prescription_items?: PrescriptionItemRow[] | PrescriptionItemRow[] | null;
            }[]
          | null
      );
      const rxItems = rawRx
        ? (Array.isArray(rawRx.prescription_items)
            ? rawRx.prescription_items
            : rawRx.prescription_items
              ? [rawRx.prescription_items]
              : []
          ).flat() as PrescriptionItemRow[]
        : [];

      const prescription: VisitPrescriptionRow | null = rawRx
        ? { id: rawRx.id, is_finalized: rawRx.is_finalized, items: rxItems }
        : null;

      const visitDocs = ((v.documents as PatientDocumentRow[]) ?? []).filter(
        (d) => d.category !== 'profile_photo'
      );

      return {
        id: v.id,
        reason: v.reason,
        status: v.status,
        checked_in_at: v.checked_in_at,
        completed_at: v.completed_at,
        is_emergency: v.is_emergency ?? false,
        doctorName: resolveAttendingDoctor(v),
        notes: mapClinicalNote(rawNotes),
        prescriptions: prescription,
        labOrders: labsByVisit.get(v.id) ?? [],
        documents: visitDocs,
      };
    });

    const customer = pet.customers as {
      id: string;
      first_name: string;
      last_name: string;
      phone: string | null;
      email: string | null;
    } | null;

    const activities = await fetchActivities(supabase, ctx.organizationId, visitIds);

    const data: PatientMedicalProfileData = {
      petId: pet.id,
      patientNumber: pet.patient_number,
      petName: pet.name,
      species: pet.species,
      breed: pet.breed,
      gender: pet.gender,
      dateOfBirth: pet.date_of_birth,
      weightKg: pet.weight_kg != null ? Number(pet.weight_kg) : null,
      allergies: pet.allergies,
      medicalNotes: pet.medical_notes,
      photoUrl: profilePhoto?.id ? `/api/documents/${profilePhoto.id}` : null,
      latestVisitStatus: visits[0]?.status ?? null,
      owner: customer
        ? {
            id: customer.id,
            name: `${customer.first_name} ${customer.last_name}`.trim(),
            phone: customer.phone,
            email: customer.email,
          }
        : null,
      visits,
      invoices: (invoices ?? []).map(
        (inv): InvoiceRow => ({
          id: inv.id,
          invoice_number: inv.invoice_number,
          total: Number(inv.total),
          payment_status: inv.payment_status,
          created_at: inv.created_at,
          visit_id: inv.visit_id,
        })
      ),
      activities,
      allDocuments: (allDocs ?? []) as PatientDocumentRow[],
    };

    return { success: true as const, data };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to load medical profile.';
    return { success: false as const, error: message };
  }
}

/** @deprecated Use getPatientMedicalProfileAction */
export async function getDoctorPatientMedicalHistoryAction(petId: string) {
  return getPatientMedicalProfileAction(petId);
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
      visit_type: parsed.visitType || 'standard',
      chief_complaint: parsed.chiefComplaint,
      history: parsed.history || null,
      examination_findings: parsed.examinationFindings || null,
      diagnosis: parsed.diagnosis,
      treatment_plan: parsed.treatmentPlan || null,
      procedure_notes: parsed.procedureNotes || null,
      post_op_medication: parsed.postOpMedication || null,
      internal_notes: parsed.internalNotes || null,
      follow_up_recommendation: parsed.followUpRecommendation || null,
      follow_up_days: parsed.followUpDays?.length ? parsed.followUpDays : null,
      temperature_c: numOrNull(parsed.temperatureC),
      heart_rate_bpm: numOrNull(parsed.heartRateBpm),
      respiratory_rate: numOrNull(parsed.respiratoryRate),
      weight_kg: numOrNull(parsed.weightKg),
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
      return { success: false as const, error: formatZodError(err) };
    }
    const message = err instanceof Error ? err.message : 'Failed to update clinical note.';
    return { success: false as const, error: message };
  }
}

export async function updatePatientCareNotesAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized: Session is invalid.' };
    }
    assertOrganization(ctx);

    if (!canEditCareNotes(ctx)) {
      return { success: false as const, error: 'You do not have permission to edit care notes.' };
    }

    const parsed = UpdatePatientCareNotesSchema.parse(payload);
    const supabase = await createClient();

    const updatePayload: Record<string, unknown> = {
      allergies: parsed.allergies || null,
      medical_notes: parsed.medicalNotes || null,
    };
    const weight = numOrNull(parsed.weightKg);
    if (weight !== null) updatePayload.weight_kg = weight;

    const { error } = await supabase
      .from('patients')
      .update(updatePayload)
      .eq('id', parsed.patientId)
      .eq('organization_id', ctx.organizationId);

    if (error) {
      return { success: false as const, error: error.message || 'Failed to update care notes.' };
    }

    return { success: true as const };
  } catch (err: unknown) {
    if (err instanceof ZodError) {
      return { success: false as const, error: formatZodError(err) };
    }
    const message = err instanceof Error ? err.message : 'Failed to update care notes.';
    return { success: false as const, error: message };
  }
}

export async function uploadPatientPhotoAction(formData: FormData) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      return { success: false as const, error: 'Unauthorized: Session is invalid.' };
    }
    assertOrganization(ctx);

    if (!canUploadPhoto(ctx)) {
      return { success: false as const, error: 'You do not have permission to upload photos.' };
    }

    const patientId = formData.get('patientId') as string;
    if (!patientId) {
      return { success: false as const, error: 'Patient ID is required.' };
    }

    const file = formData.get('file');
    if (!(file instanceof File) || file.size === 0) {
      return { success: false as const, error: 'No file provided.' };
    }
    if (file.size > MAX_PHOTO_BYTES) {
      return { success: false as const, error: 'Photo exceeds the 8 MB limit.' };
    }
    if (!isPhotoFile(file)) {
      return { success: false as const, error: 'Unsupported image type. Use JPG, PNG, or WebP.' };
    }

    const supabase = await createClient();

    const { data: patient, error: patientError } = await supabase
      .from('patients')
      .select('id, organization_id')
      .eq('id', patientId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (patientError || !patient) {
      return { success: false as const, error: 'Patient not found or access denied.' };
    }

    const branchId = ctx.activeBranchId ?? ctx.branches[0]?.id ?? null;

    await supabase
      .from('documents')
      .update({ deleted_at: new Date().toISOString() })
      .eq('patient_id', patientId)
      .eq('organization_id', ctx.organizationId)
      .eq('category', 'profile_photo')
      .is('deleted_at', null);

    const safeName = sanitizeFileName(file.name);
    const storagePath = `${ctx.organizationId}/profile-photos/${patientId}/${Date.now()}-${safeName}`;

    const arrayBuffer = await file.arrayBuffer();
    const contentType =
      file.type && file.type !== 'application/octet-stream'
        ? file.type
        : fileExtension(safeName) === '.png'
          ? 'image/png'
          : 'image/jpeg';

    const { error: uploadError } = await supabase.storage
      .from(DOCUMENTS_BUCKET)
      .upload(storagePath, arrayBuffer, { contentType, upsert: false });

    if (uploadError) {
      return { success: false as const, error: uploadError.message || 'Failed to upload photo.' };
    }

    const { data: doc, error: docError } = await supabase
      .from('documents')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: branchId,
        patient_id: patientId,
        visit_id: null,
        uploaded_by: ctx.userId,
        bucket_id: DOCUMENTS_BUCKET,
        storage_path: storagePath,
        file_name: safeName,
        mime_type: contentType,
        size_bytes: file.size,
        category: 'profile_photo',
        description: 'Patient profile photo',
      })
      .select('id')
      .single();

    if (docError || !doc) {
      await supabase.storage.from(DOCUMENTS_BUCKET).remove([storagePath]);
      return { success: false as const, error: docError?.message || 'Failed to save photo record.' };
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'staff',
      action: 'DOCUMENT_UPLOADED',
      resourceType: 'DOCUMENT',
      resourceId: doc.id,
      afterData: { patient_id: patientId, category: 'profile_photo' },
    });

    return { success: true as const, photoUrl: `/api/documents/${doc.id}` };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to upload photo.';
    return { success: false as const, error: message };
  }
}
