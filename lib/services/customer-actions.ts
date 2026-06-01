'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { resolveServerSession } from '@/lib/services/auth';
import { writeAuditLog } from '@/lib/services/audit';

export const CustomerSchema = z.object({
  firstName: z.string().min(1, { message: 'First name is required' }),
  lastName: z.string().min(1, { message: 'Last name is required' }),
  email: z.string().email({ message: 'Invalid email address' }).optional().or(z.literal('')),
  phone: z.string().min(5, { message: 'Phone number is required' }),
  address: z.string().optional().or(z.literal('')),
  branchId: z.string().uuid({ message: 'Invalid branch selection' }),
});

export type CustomerInput = z.infer<typeof CustomerSchema>;

/**
 * Creates a new customer profile.
 */
export async function createCustomerAction(payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.organizationId) {
      throw new Error('Unauthorized: Session has expired or is invalid.');
    }

    const parsed = CustomerSchema.parse(payload);

    // Verify the caller has access to the target branch
    if (!session.branches.some((b) => b.id === parsed.branchId)) {
      throw new Error('Unauthorized: You do not have access to this branch.');
    }

    const supabase = await createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        organization_id: session.organizationId,
        branch_id: parsed.branchId,
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        email: parsed.email || null,
        phone: parsed.phone,
        address: parsed.address || null,
        created_by: session.userId,
      })
      .select()
      .single();

    if (error || !customer) {
      throw new Error(error?.message || 'Failed to create customer.');
    }

    // Write audit log
    await writeAuditLog({
      organizationId: session.organizationId,
      branchId: parsed.branchId,
      actorUserId: session.userId,
      actorRole: session.role || 'receptionist',
      action: 'CUSTOMER_CREATED',
      resourceType: 'CUSTOMER',
      resourceId: customer.id,
      afterData: customer,
    });

    return { success: true, customer };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Updates a customer profile.
 */
export async function updateCustomerAction(customerId: string, payload: unknown) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.organizationId) {
      throw new Error('Unauthorized: Session is invalid.');
    }

    const parsed = CustomerSchema.parse(payload);
    const supabase = await createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        email: parsed.email || null,
        phone: parsed.phone,
        address: parsed.address || null,
      })
      .eq('id', customerId)
      .eq('organization_id', session.organizationId)
      .select()
      .single();

    if (error || !customer) {
      throw new Error(error?.message || 'Failed to update customer profile.');
    }

    return { success: true, customer };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

/**
 * Searches for customers inside the organization matching name or phone queries.
 * Includes nested pet information for quick intake lookup.
 */
export async function searchCustomersAction(query: string) {
  try {
    const session = await resolveServerSession();
    if (!session || !session.organizationId) {
      throw new Error('Unauthorized');
    }

    if (!query || query.trim().length < 2) {
      return { success: true, customers: [] };
    }

    const supabase = await createClient();
    const { data: customers, error } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email, pets ( id, name, species, breed )')
      .eq('organization_id', session.organizationId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(8);

    if (error) {
      throw new Error(error.message);
    }

    // Format the response structure
    const formatted = customers.map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: c.phone,
      email: c.email || '',
      pets: (c.pets as any[] || []).map((p) => ({
        id: p.id,
        name: p.name,
        species: p.species,
        breed: p.breed || '',
      })),
    }));

    return { success: true, customers: formatted };
  } catch (err: any) {
    return { success: false, error: err.message || 'An unexpected error occurred.' };
  }
}

