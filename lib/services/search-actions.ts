'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import { hasCapability } from '@/lib/auth/capabilities';
import {
  assertActiveBranch,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';

const SearchSchema = z.object({
  query: z.string().min(2).max(100),
});

export type SearchResultItem = {
  type: 'customer' | 'pet' | 'invoice' | 'visit';
  id: string;
  title: string;
  subtitle: string;
  href: string;
};

function escapeIlike(term: string): string {
  return term.replace(/[%_]/g, '');
}

export async function globalClinicSearchAction(payload: unknown): Promise<{
  success: boolean;
  results?: SearchResultItem[];
  error?: string;
}> {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx || (ctx.isSuperAdmin && !ctx.isImpersonating)) {
      return { success: false, error: 'Unauthorized' };
    }
    assertOrganization(ctx);
    assertActiveBranch(ctx);

    const { query } = SearchSchema.parse(payload);
    const term = escapeIlike(query.trim());
    const pattern = `%${term}%`;
    const supabase = await createClient();
    const branchId = ctx.activeBranchId!;
    const orgId = ctx.organizationId;

    const canSearchCustomers = hasCapability(ctx.role, 'manage_customers');
    const canSearchPets = hasCapability(ctx.role, 'manage_pets');
    const canSearchInvoices = hasCapability(ctx.role, 'billing_checkout');
    const canSearchClinical = hasCapability(ctx.role, 'clinical_queue');

    const queries: Promise<unknown>[] = [];

    if (canSearchCustomers) {
      queries.push(
        supabase
          .from('customers')
          .select('id, first_name, last_name, phone, email')
          .eq('organization_id', orgId)
          .eq('branch_id', branchId)
          .or(
            `first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`
          )
          .limit(5)
      );
    } else {
      queries.push(Promise.resolve({ data: [] }));
    }

    if (canSearchPets) {
      queries.push(
        supabase
          .from('pets')
          .select('id, name, species, customers ( first_name, last_name )')
          .eq('organization_id', orgId)
          .ilike('name', pattern)
          .limit(5)
      );
    } else if (canSearchClinical) {
      queries.push(
        supabase
          .from('pets')
          .select('id, name, species, customers ( first_name, last_name )')
          .eq('organization_id', orgId)
          .ilike('name', pattern)
          .limit(5)
      );
    } else {
      queries.push(Promise.resolve({ data: [] }));
    }

    if (canSearchInvoices) {
      queries.push(
        supabase
          .from('invoices')
          .select('id, invoice_number, payment_status, total')
          .eq('organization_id', orgId)
          .eq('branch_id', branchId)
          .ilike('invoice_number', pattern)
          .limit(5)
      );
    } else {
      queries.push(Promise.resolve({ data: [] }));
    }

    if (canSearchClinical) {
      queries.push(
        supabase
          .from('visits')
          .select(
            `
            id, reason, status,
            pets ( name, species ),
            customers ( first_name, last_name )
          `
          )
          .eq('branch_id', branchId)
          .in('status', ['waiting', 'consulting', 'ready_for_checkout'])
          .or(`reason.ilike.${pattern}`)
          .limit(5)
      );
    } else {
      queries.push(Promise.resolve({ data: [] }));
    }

    const [customersRes, petsRes, invoicesRes, visitsRes] = (await Promise.all(
      queries
    )) as [
      { data: Array<Record<string, unknown>> | null },
      { data: Array<Record<string, unknown>> | null },
      { data: Array<Record<string, unknown>> | null },
      { data: Array<Record<string, unknown>> | null },
    ];

    const results: SearchResultItem[] = [];

    if (canSearchCustomers) {
      for (const c of customersRes.data || []) {
        results.push({
          type: 'customer',
          id: c.id as string,
          title: `${c.first_name} ${c.last_name}`.trim(),
          subtitle: (c.phone as string) || (c.email as string) || 'Customer',
          href: `/dashboard/customers/${c.id}`,
        });
      }
    }

    for (const p of petsRes.data || []) {
      const owner = p.customers as { first_name?: string; last_name?: string } | null;
      const ownerName = owner ? `${owner.first_name} ${owner.last_name}`.trim() : '';
      results.push({
        type: 'pet',
        id: p.id as string,
        title: p.name as string,
        subtitle: `${p.species}${ownerName ? ` · ${ownerName}` : ''}`,
        href: canSearchPets
          ? `/dashboard/pets/${p.id}`
          : '/dashboard/doctors',
      });
    }

    if (canSearchInvoices) {
      for (const inv of invoicesRes.data || []) {
        results.push({
          type: 'invoice',
          id: inv.id as string,
          title: inv.invoice_number as string,
          subtitle: `${inv.payment_status} · $${Number(inv.total).toFixed(2)}`,
          href: `/dashboard/invoices/${inv.id}`,
        });
      }
    }

    if (canSearchClinical) {
      for (const v of visitsRes.data || []) {
        const pet = v.pets as { name?: string; species?: string } | null;
        const customer = v.customers as { first_name?: string; last_name?: string } | null;
        const petName = pet?.name || 'Patient';
        const ownerName = customer
          ? `${customer.first_name} ${customer.last_name}`.trim()
          : '';
        results.push({
          type: 'visit',
          id: v.id as string,
          title: petName,
          subtitle: `${v.status}${ownerName ? ` · ${ownerName}` : ''}${v.reason ? ` · ${v.reason}` : ''}`,
          href: `/dashboard/doctors/${v.id}`,
        });
      }
    }

    return { success: true, results };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Search failed',
    };
  }
}
