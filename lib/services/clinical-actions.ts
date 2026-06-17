'use server';

import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { CompleteConsultationSchema, EntityIdSchema } from '@/lib/validations/schemas';
import { z } from 'zod';
import type { FollowUpScheduleInput } from '@/lib/consultation/follow-up-schedule';
import { followUpPreviewsToDates, computeFollowUpPreviews } from '@/lib/consultation/follow-up-schedule';

const ConsultationDraftSchema = z.record(z.string(), z.unknown());

/**
 * Persists in-progress SOAP form state on visits.consult_draft for resume.
 */
export async function saveConsultationDraftAction(visitId: string, draft: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const parsedVisitId = EntityIdSchema.parse(visitId);
    const parsedDraft = ConsultationDraftSchema.parse(draft);

    const supabase = await createClient();

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select(`
        id,
        status,
        branch_id,
        visit_assignments!inner ( doctor_id )
      `)
      .eq('id', parsedVisitId)
      .eq('organization_id', ctx.organizationId)
      .eq('visit_assignments.doctor_id', ctx.userId)
      .single();

    if (visitError || !visit) {
      throw new Error('Visit not found or you are not the assigned doctor.');
    }
    if (visit.status !== 'consulting') {
      throw new Error('Draft can only be saved during an active consultation.');
    }

    const { error } = await supabase
      .from('visits')
      .update({ consult_draft: parsedDraft })
      .eq('id', parsedVisitId);

    if (error) {
      throw new Error(error.message || 'Failed to save draft.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'CLINICAL_NOTE_UPDATED',
      resourceType: 'VISIT',
      resourceId: parsedVisitId,
      afterData: { consult_draft_saved: true },
    });

    return { success: true as const };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'Failed to save draft.';
    return { success: false as const, error: message };
  }
}

function formatTime(d: Date): string {
  return d.toTimeString().slice(0, 8);
}

async function createFollowUpAppointments(
  supabase: Awaited<ReturnType<typeof createClient>>,
  ctx: NonNullable<Awaited<ReturnType<typeof resolveServerAuthContext>>>,
  visit: {
    id: string;
    branch_id: string;
    patient_id: string;
    customer_id: string;
    doctor_id: string | null;
    checked_in_at: string;
    appointment_id: string | null;
  },
  schedule: FollowUpScheduleInput,
  followUpNote: string | null,
  diagnosis: string
) {
  const baseDate = visit.checked_in_at.slice(0, 10);
  const previews = computeFollowUpPreviews(schedule, baseDate);
  if (!previews.length) return;

  const { data: patient } = await supabase
    .from('patients')
    .select('name, species')
    .eq('id', visit.patient_id)
    .single();

  const { data: customer } = await supabase
    .from('customers')
    .select('first_name, last_name, email, phone')
    .eq('id', visit.customer_id)
    .single();

  if (!patient || !customer) return;

  let doctorId = visit.doctor_id;
  if (!doctorId) {
    const { data: assignment } = await supabase
      .from('visit_assignments')
      .select('doctor_id')
      .eq('visit_id', visit.id)
      .maybeSingle();
    doctorId = assignment?.doctor_id ?? null;
  }

  const baseTime = new Date(visit.checked_in_at);
  const customerName = `${customer.first_name} ${customer.last_name}`.trim();

  const { data: existingFollowUps } = await supabase
    .from('appointments')
    .select('id, preferred_date, status')
    .eq('follow_up_of_visit_id', visit.id)
    .eq('organization_id', ctx.organizationId);

  const existingDates = new Set(
    (existingFollowUps || [])
      .filter((a) => a.status === 'requested')
      .map((a) => a.preferred_date as string)
  );

  const desiredDates = new Set(followUpPreviewsToDates(previews));

  // Cancel stale requested follow-ups that are no longer selected
  for (const appt of existingFollowUps || []) {
    if (appt.status === 'requested' && !desiredDates.has(appt.preferred_date as string)) {
      await supabase.from('appointments').update({ status: 'cancelled' }).eq('id', appt.id);
    }
  }

  for (const preview of previews) {
    const preferredDate = preview.preferredDate;
    if (existingDates.has(preferredDate)) continue;

    const reason = followUpNote?.trim()
      ? `${preview.label}: ${followUpNote}`
      : `${preview.label} — ${diagnosis}`;

    const { data: appt, error } = await supabase.from('appointments').insert({
      organization_id: ctx.organizationId,
      branch_id: visit.branch_id,
      patient_id: visit.patient_id,
      customer_id: visit.customer_id,
      customer_name: customerName,
      customer_email: customer.email || '',
      customer_phone: customer.phone || '',
      patient_name: patient.name,
      patient_species: patient.species,
      preferred_date: preferredDate,
      preferred_time: formatTime(baseTime),
      reason,
      status: 'requested',
      doctor_id: doctorId,
      is_emergency: false,
      source: 'staff',
      created_by: ctx.userId,
      created_by_role: ctx.role || 'doctor',
      follow_up_of_visit_id: visit.id,
    }).select('id').single();

    if (!error && appt) {
      await writeAuditLog({
        organizationId: ctx.organizationId,
        branchId: visit.branch_id,
        actorUserId: ctx.userId,
        actorRole: ctx.role || 'doctor',
        action: 'APPOINTMENT_CREATED',
        resourceType: 'APPOINTMENT',
        resourceId: appt.id,
        afterData: { status: 'requested', follow_up_of_visit_id: visit.id, date: preferredDate },
      });
    }
  }
}

/**
 * Saves clinical notes, services, prescriptions, follow-up appointments,
 * and sets visit to ready_for_checkout.
 */
export async function completeConsultationAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'clinical_queue');

    const parsed = CompleteConsultationSchema.parse(payload);
    const supabase = await createClient();

    const { data: visit, error: visitError } = await supabase
      .from('visits')
      .select('*')
      .eq('id', parsed.visitId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (visitError || !visit) {
      throw new Error('Visit record not found or access denied.');
    }

    if (parsed.visitType === 'lab') {
      const { count: labOrderCount } = await supabase
        .from('lab_orders')
        .select('id', { count: 'exact', head: true })
        .eq('visit_id', parsed.visitId);

      if (!labOrderCount) {
        throw new Error('Lab-focused visit: order at least one lab test before completing.');
      }
    }

    const numOrNull = (v: number | undefined) =>
      v !== undefined && !Number.isNaN(v) ? v : null;

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
      follow_up_days:
        parsed.followUpMode === 'offset' && (parsed.followUpOffsetDays?.length ?? 0) > 0
          ? parsed.followUpOffsetDays
          : parsed.followUpDays?.length
            ? parsed.followUpDays
            : null,
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
          .select()
          .single()
      : await supabase
          .from('clinical_notes')
          .insert({ visit_id: parsed.visitId, ...notePayload, created_by: ctx.userId })
          .select()
          .single();

    if (notesResult.error) {
      throw new Error(notesResult.error.message || 'Failed to save clinical notes.');
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

    // Persist visit services
    if (parsed.serviceItems && parsed.serviceItems.length > 0) {
      await supabase.from('visit_services').delete().eq('visit_id', visit.id);

      const serviceInserts = parsed.serviceItems.map((item) => ({
        visit_id: visit.id,
        service_id: item.serviceId || null,
        name: item.name,
        unit_price: item.unitPrice,
        quantity: item.quantity,
        added_by: ctx.userId,
      }));

      const { error: svcError } = await supabase.from('visit_services').insert(serviceInserts);
      if (svcError) {
        throw new Error(svcError.message || 'Failed to save services performed.');
      }
    }

    let prescriptionId: string | null = null;
    if (parsed.prescriptionItems.length > 0) {
      const { data: prescription, error: presError } = await supabase
        .from('prescriptions')
        .insert({
          organization_id: ctx.organizationId,
          branch_id: visit.branch_id,
          visit_id: visit.id,
          patient_id: visit.patient_id,
          doctor_id: ctx.userId,
          is_finalized: true,
          revision_number: 1,
        })
        .select()
        .single();

      if (presError || !prescription) {
        throw new Error(presError?.message || 'Failed to initialize prescription.');
      }

      prescriptionId = prescription.id;

      const itemInserts = parsed.prescriptionItems.map((item) => ({
        prescription_id: prescriptionId,
        product_id: item.productId || null,
        medicine_name: item.medicineName,
        dosage: item.dosage,
        frequency: item.frequency,
        duration: item.duration,
        instructions: item.instructions || null,
        quantity_requested: item.quantityRequested,
      }));

      const { error: itemsError } = await supabase
        .from('prescription_items')
        .insert(itemInserts);

      if (itemsError) {
        await supabase.from('prescriptions').delete().eq('id', prescriptionId);
        throw new Error(itemsError.message || 'Failed to add prescription items.');
      }

      await writeAuditLog({
        organizationId: ctx.organizationId,
        branchId: visit.branch_id,
        actorUserId: ctx.userId,
        actorRole: ctx.role || 'doctor',
        action: 'PRESCRIPTION_CREATED',
        resourceType: 'PRESCRIPTION',
        resourceId: prescriptionId || undefined,
        afterData: prescription,
      });
    }

    // Auto-create follow-up appointments
    if (parsed.followUpMode && parsed.followUpMode !== 'none') {
      const schedule: FollowUpScheduleInput = {
        mode: parsed.followUpMode,
        offsetDays: parsed.followUpOffsetDays ?? [],
        consecutive: parsed.followUpConsecutive,
      };
      await createFollowUpAppointments(
        supabase,
        ctx,
        visit,
        schedule,
        parsed.followUpRecommendation || null,
        parsed.diagnosis
      );
    } else if (parsed.followUpDays && parsed.followUpDays.length > 0) {
      await createFollowUpAppointments(
        supabase,
        ctx,
        visit,
        { mode: 'offset', offsetDays: parsed.followUpDays },
        parsed.followUpRecommendation || null,
        parsed.diagnosis
      );
    }

    const { data: updatedVisit, error: visitUpdateError } = await supabase
      .from('visits')
      .update({
        status: 'ready_for_checkout',
        completed_at: new Date().toISOString(),
      })
      .eq('id', visit.id)
      .select('id, status')
      .single();

    if (visitUpdateError || updatedVisit?.status !== 'ready_for_checkout') {
      throw new Error(visitUpdateError?.message || 'Failed to transition visit to checkout.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: visit.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'doctor',
      action: 'VISIT_READY_FOR_CHECKOUT',
      resourceType: 'VISIT',
      resourceId: visit.id,
      afterData: { status: 'ready_for_checkout' },
    });

    return { success: true, visitId: visit.id, prescriptionId };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
