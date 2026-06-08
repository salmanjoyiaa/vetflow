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
import { looksLikePhone, normalizePhoneInput } from '@/lib/reception/phone';

export type CustomerSearchResult = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  email: string;
  address?: string;
  pets: { id: string; name: string; species: string; breed: string }[];
};

function formatCustomerRow(
  c: {
    id: string;
    first_name: string;
    last_name: string;
    phone: string;
    email: string | null;
    address?: string | null;
    pets: { id: string; name: string; species: string; breed: string | null }[] | null;
  }
): CustomerSearchResult {
  return {
    id: c.id,
    firstName: c.first_name,
    lastName: c.last_name,
    phone: c.phone,
    email: c.email || '',
    address: c.address || undefined,
    pets: (c.pets || []).map((p) => ({
      id: p.id,
      name: p.name,
      species: p.species,
      breed: p.breed || '',
    })),
  };
}

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

    const normalizedPhone = normalizePhoneInput(parsed.phone);
    const { data: existing } = await supabase
      .from('customers')
      .select('id, first_name, last_name, phone')
      .eq('organization_id', ctx.organizationId)
      .eq('branch_id', parsed.branchId)
      .or(`phone.eq.${parsed.phone},phone.ilike.%${normalizedPhone}%`)
      .maybeSingle();

    if (existing) {
      return {
        success: false,
        error: `A customer with this phone already exists: ${existing.first_name} ${existing.last_name}. Use the existing record instead.`,
        existingCustomerId: existing.id,
      };
    }

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

export async function lookupCustomerByPhoneAction(phone: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }
    assertOrganization(ctx);

    const normalized = normalizePhoneInput(phone);
    if (normalized.replace(/^\+/, '').length < 7) {
      return { success: true, customer: null };
    }

    const supabase = await createClient();
    let q = supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email, pets:patients ( id, name, species, breed )')
      .eq('organization_id', ctx.organizationId);

    if (ctx.activeBranchId) {
      q = q.eq('branch_id', ctx.activeBranchId);
    }

    const { data, error } = await q
      .or(`phone.ilike.%${normalized}%,phone.ilike.%${phone.trim()}%`)
      .limit(1)
      .maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return { success: true, customer: null };
    }

    return { success: true, customer: formatCustomerRow(data) };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}

export async function getCustomerByIdAction(customerId: string) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized');
    }
    assertOrganization(ctx);

    const supabase = await createClient();
    let q = supabase
      .from('customers')
      .select('id, first_name, last_name, phone, email, address, pets:patients ( id, name, species, breed )')
      .eq('id', customerId)
      .eq('organization_id', ctx.organizationId);

    if (ctx.activeBranchId) {
      q = q.eq('branch_id', ctx.activeBranchId);
    }

    const { data, error } = await q.maybeSingle();

    if (error) {
      throw new Error(error.message);
    }

    if (!data) {
      return { success: true, customer: null };
    }

    return { success: true, customer: formatCustomerRow(data) };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Failed to load customer.',
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
    const trimmed = query.trim();
    const normalized = normalizePhoneInput(trimmed);

    const baseSelect =
      'id, first_name, last_name, phone, email, pets:patients ( id, name, species, breed )';

    let formatted: CustomerSearchResult[] = [];

    if (looksLikePhone(trimmed)) {
      let phoneQuery = supabase
        .from('customers')
        .select(baseSelect)
        .eq('organization_id', ctx.organizationId)
        .or(`phone.ilike.%${normalized}%,phone.ilike.%${trimmed}%`)
        .limit(8);

      if (ctx.activeBranchId) {
        phoneQuery = phoneQuery.eq('branch_id', ctx.activeBranchId);
      }

      const { data: phoneMatches, error: phoneErr } = await phoneQuery;
      if (phoneErr) {
        throw new Error(phoneErr.message);
      }
      formatted = (phoneMatches || []).map(formatCustomerRow);
    }

    if (formatted.length < 8) {
      let nameQuery = supabase
        .from('customers')
        .select(baseSelect)
        .eq('organization_id', ctx.organizationId)
        .or(`first_name.ilike.%${trimmed}%,last_name.ilike.%${trimmed}%`)
        .limit(8);

      if (ctx.activeBranchId) {
        nameQuery = nameQuery.eq('branch_id', ctx.activeBranchId);
      }

      const { data: nameMatches, error: nameErr } = await nameQuery;
      if (nameErr) {
        throw new Error(nameErr.message);
      }

      const seen = new Set(formatted.map((c) => c.id));
      for (const row of nameMatches || []) {
        if (!seen.has(row.id) && formatted.length < 8) {
          formatted.push(formatCustomerRow(row));
          seen.add(row.id);
        }
      }
    }

    return { success: true, customers: formatted };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'An unexpected error occurred.',
    };
  }
}
