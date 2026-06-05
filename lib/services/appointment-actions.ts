'use server';

import { createClient, createAdminClient } from '@/lib/supabase/server';
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
import {
  AppointmentRequestSchema,
  MarkEmergencySchema,
  RescheduleAppointmentSchema,
  StaffAppointmentSchema,
} from '@/lib/validations/schemas';

/**
 * Creates a public appointment request (open access endpoint for booking widget).
 * Dispatches a request confirmation email to the owner.
 */
export async function createAppointmentRequestAction(payload: unknown) {
  try {
    const parsed = AppointmentRequestSchema.parse(payload);
    
    // Use admin client since guest users have no authenticated session
    const adminClient = await createAdminClient();

    // 1. Locate organization by slug
    const { data: org, error: orgErr } = await adminClient
      .from('organizations')
      .select('id, name')
      .eq('slug', parsed.orgSlug)
      .single();

    if (orgErr || !org) {
      throw new Error('Target clinic organization not found.');
    }

    // 2. Create the Appointment
    const { data: appt, error: apptErr } = await adminClient
      .from('appointments')
      .insert({
        organization_id: org.id,
        branch_id: parsed.branchId,
        customer_name: parsed.customerName,
        customer_email: parsed.customerEmail,
        customer_phone: parsed.customerPhone,
        pet_name: parsed.petName,
        pet_species: parsed.petSpecies,
        preferred_date: parsed.preferredDate,
        preferred_time: parsed.preferredTime,
        reason: parsed.reason,
        status: 'requested',
      })
      .select()
      .single();

    if (apptErr || !appt) {
      throw new Error(apptErr?.message || 'Failed to submit appointment request.');
    }

    // 3. Dispatch Email confirmation
    const emailHtml = compileAppointmentRequestTemplate(
      org.name,
      parsed.petName,
      parsed.preferredDate,
      parsed.preferredTime
    );

    await sendEmail({
      to: parsed.customerEmail,
      subject: `Appointment Request Received - ${org.name}`,
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
      ctx.organizationName || 'VetFlow Center',
      appt.pet_name,
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
      .from('pets')
      .select('id, name, species, customer_id')
      .eq('id', parsed.petId)
      .eq('organization_id', ctx.organizationId)
      .single();

    if (petErr || !pet || pet.customer_id !== customer.id) {
      throw new Error('Pet not found or does not belong to the selected customer.');
    }

    const doctorId =
      parsed.doctorId && parsed.doctorId.length > 0 ? parsed.doctorId : null;

    const { data: appt, error: apptErr } = await supabase
      .from('appointments')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        customer_id: customer.id,
        pet_id: pet.id,
        customer_name: `${customer.first_name} ${customer.last_name}`.trim(),
        customer_email: customer.email || '',
        customer_phone: customer.phone || '',
        pet_name: pet.name,
        pet_species: pet.species,
        preferred_date: parsed.preferredDate,
        preferred_time: parsed.preferredTime,
        reason: parsed.reason,
        doctor_id: doctorId,
        is_emergency: parsed.isEmergency,
        intake_notes: parsed.intakeNotes?.trim() || null,
        status: 'confirmed',
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

    if (apptErr || !appt || !['confirmed', 'rescheduled'].includes(appt.status)) {
      throw new Error('Appointment is not confirmed or not found.');
    }

    assertBranchAccess(ctx, appt.branch_id);

    const assignedDoctorId = doctorId || appt.doctor_id;
    if (!assignedDoctorId) {
      throw new Error('Select an attending veterinarian before check-in.');
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

    // 3. Find or create Pet under customer
    let petId = appt.pet_id as string | null;

    if (!petId) {
    const { data: existingPet } = await supabase
      .from('pets')
      .select('id')
      .eq('name', appt.pet_name)
      .eq('customer_id', customerId)
      .maybeSingle();

    if (existingPet) {
      petId = existingPet.id;
    } else {
      // Create new pet profile
      const { data: newPet } = await supabase
        .from('pets')
        .insert({
          organization_id: ctx.organizationId,
          customer_id: customerId,
          name: appt.pet_name,
          species: appt.pet_species || 'Dog',
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
        pet_id: petId,
        customer_id: customerId,
        appointment_id: appt.id,
        reason: appt.reason,
        status: 'waiting',
        is_emergency: appt.is_emergency ?? false,
        triage_notes: appt.intake_notes || null,
      })
      .select()
      .single();

    if (visitErr || !visit) {
      throw new Error('Failed to check in patient visit queue.');
    }

    // 5. Create Vet Assignment
    await supabase.from('visit_assignments').insert({
      visit_id: visit.id,
      doctor_id: assignedDoctorId,
    });

    // 6. Update appointment status to checked_in
    await supabase
      .from('appointments')
      .update({ status: 'checked_in', pet_id: petId })
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

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
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
