'use server';

import { headers } from 'next/headers';
import { createClient, createAdminClient } from '@/lib/supabase/server';
import { checkRateLimit } from '@/lib/security/rate-limit';
import {
  assertBranchAccess,
  assertCapability,
  assertFeature,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { 
  sendEmail, 
  compileAppointmentRequestTemplate, 
  compileAppointmentConfirmedTemplate 
} from '@/lib/email';
import { createCustomerAction } from '@/lib/services/customer-actions';
import { createPetAction } from '@/lib/services/pet-actions';
import {
  AppointmentRequestSchema,
  AppointmentWithPatientSchema,
  MarkEmergencySchema,
  RescheduleAppointmentSchema,
  UpdateAppointmentDetailsSchema,
  StaffAppointmentSchema,
} from '@/lib/validations/schemas';

async function ensureVisitAssignment(
  supabase: Awaited<ReturnType<typeof createClient>>,
  visitId: string,
  doctorId: string
) {
  const { data: existing } = await supabase
    .from('visit_assignments')
    .select('id')
    .eq('visit_id', visitId)
    .maybeSingle();

  if (existing) return;

  const { error } = await supabase.from('visit_assignments').insert({
    visit_id: visitId,
    doctor_id: doctorId,
  });

  if (error) {
    throw new Error(error.message || 'Failed to bind doctor assignment.');
  }

  await supabase.from('visits').update({ doctor_id: doctorId }).eq('id', visitId);
}

/**
 * Creates a public appointment request (open access endpoint for booking widget).
 *
 * Security: the request is rate-limited per client IP and inserted through the
 * SECURITY DEFINER `submit_public_appointment` RPC, which resolves the org by
 * slug and validates the branch belongs to that org. The client can never inject
 * an arbitrary organization_id or branch_id. Dispatches a confirmation email.
 */
export async function createAppointmentRequestAction(payload: unknown) {
  try {
    const parsed = AppointmentRequestSchema.parse(payload);

    // 1. Rate limit by client IP (best-effort; 5 requests / 10 minutes).
    const headerStore = await headers();
    const forwarded = headerStore.get('x-forwarded-for') || '';
    const clientIp =
      forwarded.split(',')[0]?.trim() ||
      headerStore.get('x-real-ip') ||
      'unknown';

    const rate = checkRateLimit(`public-booking:${clientIp}`, 5, 10 * 60 * 1000);
    if (!rate.allowed) {
      return {
        success: false,
        error: `Too many booking attempts. Please try again in ${rate.retryAfterSeconds} seconds.`,
      };
    }

    // Use admin client since guest users have no authenticated session. The
    // privileged RPC performs its own org/branch validation.
    const adminClient = await createAdminClient();

    const { data: appointmentId, error: rpcErr } = await adminClient.rpc(
      'submit_public_appointment',
      {
        p_clinic_slug: parsed.orgSlug,
        p_branch_id: parsed.branchId || null,
        p_customer_name: parsed.customerName,
        p_customer_email: parsed.customerEmail,
        p_customer_phone: parsed.customerPhone,
        p_patient_name: parsed.petName,
        p_patient_species: parsed.petSpecies,
        p_preferred_date: parsed.preferredDate,
        p_preferred_time: parsed.preferredTime,
        p_reason: parsed.reason,
      }
    );

    if (rpcErr || !appointmentId) {
      throw new Error(rpcErr?.message || 'Failed to submit appointment request.');
    }

    // Dispatch Email confirmation (org name resolved separately for the template).
    const { data: org } = await adminClient
      .from('organizations')
      .select('name')
      .eq('slug', parsed.orgSlug)
      .single();

    const emailHtml = compileAppointmentRequestTemplate(
      org?.name || 'ClinixDev Clinic',
      parsed.petName,
      parsed.preferredDate,
      parsed.preferredTime
    );

    await sendEmail({
      to: parsed.customerEmail,
      subject: `Appointment Request Received - ${org?.name || 'ClinixDev Clinic'}`,
      html: emailHtml,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Confirms an appointment (Invoked by receptionist).
 * Dispatches confirmation notification to owner.
 */
export async function confirmAppointmentAction(appointmentId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_appointments');
    assertFeature(ctx, 'appointments');

    const supabase = await createClient();

    const { data: appt, error } = await supabase
      .from('appointments')
      .update({ status: 'confirmed' })
      .eq('id', appointmentId)
      .eq('organization_id', ctx.organizationId)
      .select('*, branches ( name, address )')
      .single();

    if (error || !appt) {
      throw new Error(error?.message || 'Failed to confirm appointment.');
    }

    assertBranchAccess(ctx, appt.branch_id);

    const branchObj = appt.branches as { name?: string; address?: string } | null;
    const emailHtml = compileAppointmentConfirmedTemplate(
      ctx.organizationName || 'ClinixDev Center',
      appt.patient_name,
      appt.preferred_date,
      appt.preferred_time,
      branchObj?.address || ''
    );

    await sendEmail({
      to: appt.customer_email,
      subject: `Appointment Confirmed - ${ctx.organizationName}`,
      html: emailHtml,
    });

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: appt.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'APPOINTMENT_APPROVED',
      resourceType: 'APPOINTMENT',
      resourceId: appt.id,
      afterData: { status: 'confirmed' },
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Creates a staff-side appointment linked to customer + pet (receptionist/admin).
 */
export async function createStaffAppointmentAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_appointments');
    assertFeature(ctx, 'appointments');

    const parsed = StaffAppointmentSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const supabase = await createClient();

    const { data: customer, error: custErr } = await supabase
      .from('customers')
      .select('id, first_name, last_name, email, phone, branch_id')
      .eq('id', parsed.customerId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (custErr || !customer) {
      throw new Error('Customer not found or access denied.');
    }

    if (customer.branch_id !== parsed.branchId) {
      throw new Error('Customer does not belong to the selected branch.');
    }

    const { data: pet, error: petErr } = await supabase
      .from('patients')
      .select('id, name, species, customer_id')
      .eq('id', parsed.petId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (petErr || !pet || pet.customer_id !== customer.id) {
      throw new Error('Patient not found or does not belong to the selected customer.');
    }

    const doctorId =
      parsed.doctorId && parsed.doctorId.length > 0 ? parsed.doctorId : null;

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        customer_id: customer.id,
        patient_id: pet.id,
        customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
        patient_name: pet.name,
        patient_species: pet.species,
        source: 'staff',
        preferred_date: parsed.preferredDate,
        preferred_time: parsed.preferredTime,
        reason: parsed.reason,
        doctor_id: doctorId,
        is_emergency: parsed.isEmergency,
        intake_notes: parsed.intakeNotes?.trim() || null,
        status: 'confirmed',
        created_by: ctx.userId,
        created_by_role: ctx.role || 'receptionist',
      })
      .select()
      .single();

    if (apptErr || !appt) {
      throw new Error(apptErr?.message || 'Failed to create appointment.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'APPOINTMENT_CREATED',
      resourceType: 'APPOINTMENT',
      resourceId: appt.id,
      afterData: {
        status: 'confirmed',
        is_emergency: parsed.isEmergency,
        doctor_id: doctorId,
      },
    });

    return { success: true, appointmentId: appt.id };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

/**
 * Creates customer and/or pet when needed, then books the appointment in one flow.
 */
export async function createAppointmentWithPatientAction(payload: unknown) {
  try {
    const parsed = AppointmentWithPatientSchema.parse(payload);

    let customerId = parsed.customerId;
    let petId = parsed.petId;

    if (!customerId) {
      if (!parsed.customer) {
        throw new Error('Customer details are required.');
      }
      const custRes = await createCustomerAction({
        firstName: parsed.customer.firstName,
        lastName: parsed.customer.lastName,
        phone: parsed.customer.phone,
        email: parsed.customer.email || '',
        address: parsed.customer.address || '',
        branchId: parsed.branchId,
      });

      if (!custRes.success) {
        const existingId = (custRes as { existingCustomerId?: string }).existingCustomerId;
        if (existingId) {
          customerId = existingId;
        } else {
          throw new Error(custRes.error || 'Failed to create customer.');
        }
      } else {
        const created = (custRes as { customer?: { id: string } }).customer;
        if (!created?.id) {
          throw new Error('Failed to create customer.');
        }
        customerId = created.id;
      }
    }

    if (!petId) {
      if (!parsed.pet) {
        throw new Error('Pet details are required.');
      }
      const petRes = await createPetAction({
        customerId: customerId!,
        name: parsed.pet.name,
        species: parsed.pet.species,
        breed: parsed.pet.breed || '',
        gender: parsed.pet.gender || 'Male',
      });
      if (!petRes.success || !petRes.pet) {
        throw new Error(petRes.error || 'Failed to create pet.');
      }
      petId = petRes.pet.id;
    }

    const apptRes = await createStaffAppointmentAction({
      customerId: customerId!,
      petId: petId!,
      branchId: parsed.branchId,
      doctorId: parsed.doctorId,
      preferredDate: parsed.preferredDate,
      preferredTime: parsed.preferredTime,
      reason: parsed.reason,
      isEmergency: parsed.isEmergency,
      intakeNotes: parsed.intakeNotes,
    });

    if (!apptRes.success) {
      return apptRes;
    }

    return {
      success: true,
      appointmentId: apptRes.appointmentId,
      customerId,
      petId,
    };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

/**
 * Toggles emergency flag on an appointment.
 */
export async function markAppointmentEmergencyAction(payload: unknown) {
  try {
    const parsed = MarkEmergencySchema.parse(payload);
    const { ctx, supabase, appt } = await loadAppointmentForAction(parsed.appointmentId);

    if (['cancelled', 'completed', 'no_show', 'checked_in'].includes(appt.status)) {
      throw new Error('Cannot change emergency status for a closed appointment.');
    }

    const { error } = await supabase
      .from('appointments')
      .update({ is_emergency: parsed.isEmergency })
      .eq('id', parsed.appointmentId);

    if (error) {
      throw new Error(error.message);
    }

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: appt.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'APPOINTMENT_EMERGENCY_SET',
      resourceType: 'APPOINTMENT',
      resourceId: parsed.appointmentId,
      afterData: { is_emergency: parsed.isEmergency },
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

/**
 * Checks in a confirmed appointment, converting it into a walk-in visit queue.
 */
export async function checkInAppointmentAction(appointmentId: string, doctorId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_appointments');
    assertFeature(ctx, 'appointments');

    const supabase = await createClient();

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .select('*')
      .eq('id', appointmentId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (apptErr || !appt) {
      throw new Error('Appointment not found.');
    }

    assertBranchAccess(ctx, appt.branch_id);

    const assignedDoctorId = doctorId || appt.doctor_id;
    if (!assignedDoctorId) {
      throw new Error('Select an attending veterinarian before check-in.');
    }

    // Idempotent: already checked in — return existing visit
    if (appt.status === 'checked_in') {
      const { data: existingVisit } = await supabase
        .from('visits')
        .select('id')
        .eq('appointment_id', appointmentId)
        .eq('organization_id', ctx.organizationId)
        .maybeSingle();
      if (existingVisit) {
        await ensureVisitAssignment(supabase, existingVisit.id, assignedDoctorId);
        return { success: true, visitId: existingVisit.id, alreadyCheckedIn: true };
      }
      throw new Error('Appointment is checked in but no visit was found.');
    }

    if (!['confirmed', 'rescheduled'].includes(appt.status)) {
      throw new Error('Appointment is not confirmed or not found.');
    }

    // Guard against duplicate visit if appointment_id already linked
    const { data: preExistingVisit } = await supabase
      .from('visits')
      .select('id')
      .eq('appointment_id', appointmentId)
      .eq('organization_id', ctx.organizationId)
      .maybeSingle();

    if (preExistingVisit) {
      await supabase
        .from('appointments')
        .update({ status: 'checked_in' })
        .eq('id', appt.id);
      await ensureVisitAssignment(supabase, preExistingVisit.id, assignedDoctorId);
      return { success: true, visitId: preExistingVisit.id, alreadyCheckedIn: true };
    }

    // 2. Find or create Customer in the branch scope
    let customerId = appt.customer_id as string | null;

    if (!customerId) {
      // Find matching customer by phone
      const { data: existingCust } = await supabase
        .from('customers')
        .select('id')
        .eq('phone', appt.customer_phone)
        .eq('branch_id', appt.branch_id)
        .maybeSingle();

      if (existingCust) {
        customerId = existingCust.id;
      } else {
        // Create new customer profile
        const [firstName, ...lastNameParts] = appt.customer_name.split(' ');
        const lastName = lastNameParts.join(' ') || 'Parent';
        
        const { data: newCust } = await supabase
          .from('customers')
          .insert({
            organization_id: ctx.organizationId,
            branch_id: appt.branch_id,
            first_name: firstName,
            last_name: lastName,
            email: appt.customer_email,
            phone: appt.customer_phone,
            created_by: ctx.userId,
          })
          .select()
          .single();
        
        if (newCust) {
          customerId = newCust.id;
        }
      }
    }

    if (!customerId) {
      throw new Error('Failed to resolve or register customer file.');
    }

    // 3. Find or create Patient under customer
    let petId = appt.patient_id as string | null;

    if (!petId) {
    const { data: existingPet } = await supabase
      .from('patients')
      .select('id')
      .eq('name', appt.patient_name)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existingPet) {
      petId = existingPet.id;
    } else {
      // Create new patient profile
      const { data: newPet } = await supabase
        .from('patients')
        .insert({
          organization_id: ctx.organizationId,
          customer_id: customerId,
          patient_type: 'pet',
          name: appt.patient_name,
          species: appt.patient_species || 'Dog',
          gender: 'Male', // Default standard gender
          is_active: true,
        })
        .select()
        .single();
      
      if (newPet) {
        petId = newPet.id;
      }
    }
    }

    if (!petId) {
      throw new Error('Failed to resolve or register patient biology record.');
    }

    // 4. Create Walk-in Queue Visit
    const { data: visit, error: visitErr } = await supabase
      .from('visits')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: appt.branch_id,
        patient_id: petId,
        customer_id: customerId,
        appointment_id: appt.id,
        reason: appt.reason,
        status: 'waiting',
        is_emergency: appt.is_emergency ?? false,
        triage_notes: appt.intake_notes || null,
        doctor_id: assignedDoctorId,
      })
      .select()
      .single();

    if (visitErr || !visit) {
      // Race: another request may have created the visit
      const { data: raceVisit } = await supabase
        .from('visits')
        .select('id')
        .eq('appointment_id', appt.id)
        .eq('organization_id', ctx.organizationId)
        .maybeSingle();
      if (raceVisit) {
        await ensureVisitAssignment(supabase, raceVisit.id, assignedDoctorId);
        return { success: true, visitId: raceVisit.id, alreadyCheckedIn: true };
      }
      throw new Error('Failed to check in patient visit queue.');
    }

    // 5. Create Vet Assignment
    const { error: assignErr } = await supabase.from('visit_assignments').insert({
      visit_id: visit.id,
      doctor_id: assignedDoctorId,
    });

    if (assignErr) {
      await supabase.from('visits').delete().eq('id', visit.id);
      throw new Error(assignErr.message || 'Failed to bind doctor assignment.');
    }

    // 6. Update appointment status to checked_in
    await supabase
      .from('appointments')
      .update({ status: 'checked_in', patient_id: petId })
      .eq('id', appt.id);

    // 7. Audit Log
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: appt.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'VISIT_CREATED',
      resourceType: 'VISIT',
      resourceId: visit.id,
      afterData: { status: 'waiting' },
    });

    return { success: true, visitId: visit.id };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'An unexpected error occurred.' };
  }
}

async function loadAppointmentForAction(appointmentId: string) {
  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    throw new Error('Unauthorized: Session is invalid.');
  }
  assertOrganization(ctx);
  assertCapability(ctx, 'manage_appointments');
  assertFeature(ctx, 'appointments');

  const supabase = await createClient();
  const { data: appt, error } = await supabase
    .from('appointments')
    .select('*')
    .eq('id', appointmentId)
    .eq('organization_id', ctx.organizationId)
    .single();

  if (error || !appt) {
    throw new Error('Appointment not found or access denied.');
  }

  assertBranchAccess(ctx, appt.branch_id);
  return { ctx, supabase, appt };
}

export async function cancelAppointmentAction(appointmentId: string) {
  try {
    const { ctx, supabase, appt } = await loadAppointmentForAction(appointmentId);

    if (!['requested', 'confirmed', 'rescheduled'].includes(appt.status)) {
      throw new Error('Only pending appointments can be cancelled.');
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'cancelled' })
      .eq('id', appointmentId);

    if (error) {
      throw new Error(error.message);
    }

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: appt.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'APPOINTMENT_CANCELLED',
      resourceType: 'APPOINTMENT',
      resourceId: appointmentId,
      afterData: { status: 'cancelled' },
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function markNoShowAppointmentAction(appointmentId: string) {
  try {
    const { ctx, supabase, appt } = await loadAppointmentForAction(appointmentId);

    if (!['confirmed', 'rescheduled', 'checked_in'].includes(appt.status)) {
      throw new Error('This appointment cannot be marked as no-show.');
    }

    const { error } = await supabase
      .from('appointments')
      .update({ status: 'no_show' })
      .eq('id', appointmentId);

    if (error) {
      throw new Error(error.message);
    }

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: appt.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'APPOINTMENT_NO_SHOW',
      resourceType: 'APPOINTMENT',
      resourceId: appointmentId,
      afterData: { status: 'no_show' },
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function rescheduleAppointmentAction(payload: unknown) {
  try {
    const parsed = RescheduleAppointmentSchema.parse(payload);
    const { ctx, supabase, appt } = await loadAppointmentForAction(parsed.appointmentId);

    if (!['requested', 'confirmed', 'rescheduled'].includes(appt.status)) {
      throw new Error('This appointment cannot be rescheduled.');
    }

    const { error } = await supabase
      .from('appointments')
      .update({
        preferred_date: parsed.preferredDate,
        preferred_time: parsed.preferredTime,
        status: 'rescheduled',
      })
      .eq('id', parsed.appointmentId);

    if (error) {
      throw new Error(error.message);
    }

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: appt.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'APPOINTMENT_RESCHEDULED',
      resourceType: 'APPOINTMENT',
      resourceId: parsed.appointmentId,
      afterData: {
        preferred_date: parsed.preferredDate,
        preferred_time: parsed.preferredTime,
        status: 'rescheduled',
      },
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}

export async function updateAppointmentDetailsAction(payload: unknown) {
  try {
    const parsed = UpdateAppointmentDetailsSchema.parse(payload);
    const { ctx, supabase, appt } = await loadAppointmentForAction(parsed.appointmentId);

    if (!['requested', 'confirmed', 'rescheduled'].includes(appt.status)) {
      throw new Error('This appointment cannot be edited.');
    }

    const patch: Record<string, string> = {};
    if (parsed.reason !== undefined) patch.reason = parsed.reason;
    if (parsed.preferredDate !== undefined) patch.preferred_date = parsed.preferredDate;
    if (parsed.preferredTime !== undefined) patch.preferred_time = parsed.preferredTime;

    if (Object.keys(patch).length === 0) {
      throw new Error('No changes to save.');
    }

    const { error } = await supabase.from('appointments').update(patch).eq('id', parsed.appointmentId);

    if (error) throw new Error(error.message);

    await writeAuditLog({
      organizationId: ctx.organizationId!,
      branchId: appt.branch_id,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'APPOINTMENT_UPDATED',
      resourceType: 'APPOINTMENT',
      resourceId: parsed.appointmentId,
      afterData: patch,
    });

    return { success: true };
  } catch (err: unknown) {
    const message = err instanceof Error ? err.message : 'An unexpected error occurred.';
    return { success: false, error: message };
  }
}
