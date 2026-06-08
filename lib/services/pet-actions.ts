'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
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

    return { success: true, pet };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}
