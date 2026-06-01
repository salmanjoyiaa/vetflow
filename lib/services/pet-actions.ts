'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const PetSchema = z.object({
  name: z.string().min(1, { message: 'Pet name is required' }),
  species: z.string().min(1, { message: 'Species is required' }), // e.g. Dog, Cat, etc.
  breed: z.string().optional().or(z.literal('')),
  gender: z.string().min(1, { message: 'Gender is required' }), // Male, Female, Spayed, Neutered
  dateOfBirth: z.string().optional().or(z.literal('')),
  weightKg: z.number().nonnegative().optional().or(z.nan()),
  allergies: z.string().optional().or(z.literal('')),
  medicalNotes: z.string().optional().or(z.literal('')),
  customerId: z.string().uuid({ message: 'Invalid customer selection' }),
});

export type PetInput = z.infer<typeof PetSchema>;

/**
 * Creates a new pet profile associated with a customer.
 */
export async function createPetAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.organizationId) {
      throw new Error('Unauthorized: Session is invalid.');
    }

    const parsed = PetSchema.parse(payload);
    const supabase = await createClient();

    const { data: pet, error } = await supabase
      .from('pets')
      .insert({
        organization_id: session.organizationId,
        customer_id: parsed.customerId,
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed || null,
        gender: parsed.gender,
        date_of_birth: parsed.dateOfBirth || null,
        weight_kg: parsed.weightKg || null,
        allergies: parsed.allergies || null,
        medical_notes: parsed.medicalNotes || null,
        is_active: true,
      })
      .select()
      .single();

    if (error || !pet) {
      throw new Error(error?.message || 'Failed to create pet record.');
    }

    // Write audit log
    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: null,
      actorUserId: session.userId,
      actorRole: session.role || 'receptionist',
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
    const session = await resolveServerSession();
    if (!session || !session.organizationId) {
      throw new Error('Unauthorized: Session is invalid.');
    }

    const parsed = PetSchema.parse(payload);
    const supabase = await createClient();

    const { data: pet, error } = await supabase
      .from('pets')
      .update({
        name: parsed.name,
        species: parsed.species,
        breed: parsed.breed || null,
        gender: parsed.gender,
        date_of_birth: parsed.dateOfBirth || null,
        weight_kg: parsed.weightKg || null,
        allergies: parsed.allergies || null,
        medical_notes: parsed.medicalNotes || null,
      })
      .eq('id', petId)
      .eq('organization_id', session.organizationId)
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
