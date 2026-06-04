'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertBranchAccess,
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { CustomerSchema, type CustomerInput } from '@/lib/validations/schemas';

export async function createCustomerAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session has expired or is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_customers');

    const parsed = CustomerSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const supabase = await createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: parsed.branchId,
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        email: parsed.email || null,
        phone: parsed.phone,
        address: parsed.address || null,
        created_by: ctx.userId,
      })
      .select()
      .single();

    if (error || !customer) {
      throw new Error(error?.message || 'Failed to create customer.');
    }

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: parsed.branchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'receptionist',
      action: 'CUSTOMER_CREATED',
      resourceType: 'CUSTOMER',
      resourceId: customer.id,
      afterData: customer,
    });

    return { success: true, customer };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function updateCustomerAction(customerId: string, payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_customers');

    const parsed = CustomerSchema.parse(payload);
    assertBranchAccess(ctx, parsed.branchId);

    const supabase = await createClient();

    const { data: customer, error } = await supabase
      .from('customers')
      .update({
        first_name: parsed.firstName,
        last_name: parsed.lastName,
        email: parsed.email || null,
        phone: parsed.phone,
        address: parsed.address || null,
        branch_id: parsed.branchId,
      })
      .eq('id', customerId)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single();

    if (error || !customer) {
      throw new Error(error?.message || 'Failed to update customer profile.');
    }

    return { success: true, customer };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function searchCustomersAction(query: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }
    assertOrganization(ctx);

    if (!query || query.trim().length < 2) {
      return { success: true, customers: [] };
    }

    const supabase = await createClient();

    let customersQuery = supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email, pets ( id, name, species, breed )')
      .eq('organization_id', ctx.organizationId)
      .or(`first_name.ilike.%${query}%,last_name.ilike.%${query}%,phone.ilike.%${query}%`)
      .limit(8);

    if (ctx.activeBranchId) {
      customersQuery = customersQuery.eq('branch_id', ctx.activeBranchId);
    }

    const { data: customers, error } = await customersQuery;

    if (error) {
      throw new Error(error.message);
    }

    const formatted = (customers || []).map((c) => ({
      id: c.id,
      firstName: c.first_name,
      lastName: c.last_name,
      phone: c.phone,
      email: c.email || '',
      pets: ((c.pets as { id: string; name: string; species: string; breed: string | null }[]) || []).map(
        (p) => ({
          id: p.id,
          name: p.name,
          species: p.species,
          breed: p.breed || '',
        })
      ),
    }));

    return { success: true, customers: formatted };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}
