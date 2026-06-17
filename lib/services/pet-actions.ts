'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertClinicAdmin,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { PetSchema, type PetInput } from '@/lib/validations/schemas';

/**
 * Creates a new pet profile associated with a customer.
 */
export async function createPetAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_pets');

    const parsed = PetSchema.parse(payload);
    const supabase = await createClient();

    const { data: pet, error } = await supabase
      .from('patients')
      .insert({
        organization_id: ctx.organizationId,
        customer_id: parsed.customerId,
        patient_type: 'pet',
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed || null,
        color: parsed.color || null,
        gender: parsed.gender,
        date_of_birth: parsed.dateOfBirth || null,
        weight_kg: parsed.weightKg || null,
        microchip_number: parsed.microchipNumber || null,
        allergies: parsed.allergies || null,
        medical_notes: parsed.medicalNotes || null,
        metadata: {
          color: parsed.color || null,
          microchip_number: parsed.microchipNumber || null,
        },
        is_active: true,
      })
      .select()
      .single();

    if (error || !pet) {
      throw new Error(error?.message || 'Failed to create pet record.');
    }

    // Write audit log
    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: null,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'PET_CREATED',
      resourceType: 'PET',
      resourceId: pet.id,
      afterData: pet,
    });

    return { success: true, pet };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Updates an existing pet profile.
 */
export async function updatePetAction(petId: string, payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_pets');

    const parsed = PetSchema.parse(payload);
    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('patients')
      .select('*')
      .eq('id', petId)
      .eq('organization_id', ctx.organizationId)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Pet not found or access denied.');
    }

    const { data: pet, error } = await supabase
      .from('patients')
      .update({
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed || null,
        color: parsed.color || null,
        gender: parsed.gender,
        date_of_birth: parsed.dateOfBirth || null,
        weight_kg: parsed.weightKg || null,
        microchip_number: parsed.microchipNumber || null,
        allergies: parsed.allergies || null,
        medical_notes: parsed.medicalNotes || null,
        metadata: {
          color: parsed.color || null,
          microchip_number: parsed.microchipNumber || null,
        },
      })
      .eq('id', petId)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single();

    if (error || !pet) {
      throw new Error(error?.message || 'Failed to update pet profile.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: null,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'PET_UPDATED',
      resourceType: 'PET',
      resourceId: pet.id,
      beforeData: existing,
      afterData: pet,
    });

    return { success: true, pet };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

export async function deletePetAction(petId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertClinicAdmin(ctx);
    assertCapability(ctx, 'manage_pets');

    const supabase = await createClient();

    const { data: existing, error: fetchErr } = await supabase
      .from('patients')
      .select('*')
      .eq('id', petId)
      .eq('organization_id', ctx.organizationId)
      .is('deleted_at', null)
      .single();

    if (fetchErr || !existing) {
      throw new Error('Pet not found or already deleted.');
    }

    const { data: unpaidInvoices } = await supabase
      .from('invoices')
      .select('id')
      .eq('patient_id', petId)
      .eq('organization_id', ctx.organizationId)
      .in('payment_status', ['unpaid', 'partially_paid'])
      .limit(1);

    if (unpaidInvoices && unpaidInvoices.length > 0) {
      throw new Error('Cannot delete pet with unpaid or partially paid invoices.');
    }

    const { data: activeVisits } = await supabase
      .from('visits')
      .select('id')
      .eq('patient_id', petId)
      .eq('organization_id', ctx.organizationId)
      .not('status', 'in', '("completed","cancelled")')
      .limit(1);

    if (activeVisits && activeVisits.length > 0) {
      throw new Error('Cannot delete pet with in-progress visits.');
    }

    const now = new Date().toISOString();

    const { error } = await supabase
      .from('patients')
      .update({ is_active: false, deleted_at: now })
      .eq('id', petId)
      .eq('organization_id', ctx.organizationId);

    if (error) {
      throw new Error(error.message || 'Failed to delete pet.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: null,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'PET_DELETED',
      resourceType: 'PET',
      resourceId: petId,
      severity: 'warning',
      beforeData: existing,
    });

    return { success: true };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}
