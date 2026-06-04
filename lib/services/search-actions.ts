'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertActiveBranch,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';

const SearchSchema = z.object({
  query: z.string().min(2).max(100),
});

export type SearchResultItem = {
  type: 'customer' | 'pet' | 'invoice';
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

    const [customersRes, petsRes, invoicesRes] = await Promise.all([
      supabase
        .from('customers')
        .select('id, first_name, last_name, phone, email')
        .eq('organization_id', orgId)
        .eq('branch_id', branchId)
        .or(`first_name.ilike.${pattern},last_name.ilike.${pattern},phone.ilike.${pattern},email.ilike.${pattern}`)
        .limit(5),
      supabase
        .from('pets')
        .select('id, name, species, customers ( first_name, last_name )')
        .eq('organization_id', orgId)
        .ilike('name', pattern)
        .limit(5),
      supabase
        .from('invoices')
        .select('id, invoice_number, payment_status, total')
        .eq('organization_id', orgId)
        .eq('branch_id', branchId)
        .ilike('invoice_number', pattern)
        .limit(5),
    ]);

    const results: SearchResultItem[] = [];

    for (const c of customersRes.data || []) {
      results.push({
        type: 'customer',
        id: c.id,
        title: `${c.first_name} ${c.last_name}`.trim(),
        subtitle: c.phone || c.email || 'Customer',
        href: `/dashboard/customers/${c.id}`,
      });
    }

    for (const p of petsRes.data || []) {
      const owner = p.customers as { first_name?: string; last_name?: string } | null;
      results.push({
        type: 'pet',
        id: p.id,
        title: p.name,
        subtitle: `${p.species}${owner ? ` · ${owner.first_name} ${owner.last_name}` : ''}`,
        href: `/dashboard/pets/${p.id}`,
      });
    }

    for (const inv of invoicesRes.data || []) {
      results.push({
        type: 'invoice',
        id: inv.id,
        title: inv.invoice_number,
        subtitle: `${inv.payment_status} · $${Number(inv.total).toFixed(2)}`,
        href: `/dashboard/invoices/${inv.id}`,
      });
    }

    return { success: true, results };
  } catch (err: unknown) {
    return {
      success: false,
      error: err instanceof Error ? err.message : 'Search failed',
    };
  }
}
