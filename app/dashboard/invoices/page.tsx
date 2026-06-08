import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import InvoicesListClient from '@/components/dashboard/InvoicesListClient';
import { Receipt } from 'lucide-react';

export const metadata = {
  title: 'Billing Ledger',
  description: 'Track clinic invoices, payments, and billing records.',
};

export default async function InvoicesPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string }>;
}) {
  const { status } = await searchParams;
  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    redirect('/login');
  }

  const denied = guardRoute(ctx, '/dashboard/invoices');
  if (denied) return denied;

  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('clinix_branch_id')?.value;
  let activeBranchId = activeBranchCookie;

  if (!activeBranchId && ctx.branches.length > 0) {
    activeBranchId = ctx.branches[0].id;
  } else if (activeBranchId && !ctx.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = ctx.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to open the billing dashboard.
      </div>
    );
  }

  const supabase = await createClient();

  const { data: invoices, error } = await supabase
    .from('invoices')
    .select(`
      id,
      invoice_number,
      subtotal,
      discount,
      tax_amount,
      total,
      payment_status,
      created_at,
      customers ( first_name, last_name, email ),
      pets ( name )
    `)
    .eq('branch_id', activeBranchId)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load invoices: {error.message}
      </div>
    );
  }

  const rows = (invoices || []).map((inv) => {
    const cust = inv.customers as { first_name?: string; last_name?: string; email?: string | null } | null;
    const pet = inv.pets as { name?: string } | null;
    return {
      id: inv.id,
      invoice_number: inv.invoice_number,
      subtotal: Number(inv.subtotal),
      discount: Number(inv.discount),
      tax_amount: Number(inv.tax_amount),
      total: Number(inv.total),
      payment_status: inv.payment_status,
      created_at: inv.created_at,
      customerName: cust ? `${cust.first_name} ${cust.last_name}`.trim() : '—',
      petName: pet?.name || '—',
      customerEmail: cust?.email || null,
    };
  });

  const initialStatus =
    status === 'unpaid' || status === 'paid' ? status : ('all' as const);

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          Billing & invoicing
        </h2>
        <p className="text-xs text-on-surface-variant/70 mt-1">
          Filter by payment status, print PDFs, mark invoices paid, or resend receipts.
        </p>
      </div>

      <InvoicesListClient invoices={rows} initialStatus={initialStatus} />
    </div>
  );
}
