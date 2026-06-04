import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
import Link from 'next/link';
import { Receipt, Calendar, User, Heart, CheckCircle2, ChevronRight, Eye } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Billing Ledger',
  description: 'Track clinic invoices, payments, and billing records.',
};

export default async function InvoicesPage() {
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  // 1. Resolve branch context
  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('vetflow_branch_id')?.value;
  let activeBranchId = activeBranchCookie;

  if (!activeBranchId && session.branches.length > 0) {
    activeBranchId = session.branches[0].id;
  } else if (activeBranchId && !session.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = session.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs p-6 rounded-2xl">
        You must be assigned to a clinic branch to open the billing dashboard.
      </div>
    );
  }

  const supabase = await createClient();

  // 2. Fetch invoices for active branch
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
      customers ( first_name, last_name ),
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

  return (
    <div className="space-y-8">
      
      {/* HEADER */}
      <div>
        <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
          <Receipt className="w-5 h-5 text-primary" />
          Billing & Invoicing Ledger
        </h2>
        <p className="text-xs text-on-surface-variant/70 mt-1">
          Review invoices, check payments, and inspect financial client accounts.
        </p>
      </div>

      {/* INVOICE TABLE */}
      {invoices && invoices.length > 0 ? (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
                <th className="px-6 py-4">Invoice ID</th>
                <th className="px-6 py-4">Patient / Owner</th>
                <th className="px-6 py-4">Calculated Total</th>
                <th className="px-6 py-4">Payment Status</th>
                <th className="px-6 py-4">Created Date</th>
                <th className="px-6 py-4 text-right">Actions</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/30 text-xs">
              {invoices.map((inv) => (
                <tr key={inv.id} className="hover:bg-surface-container/10 transition-colors">
                  <td className="px-6 py-4 font-bold text-on-surface">
                    {inv.invoice_number}
                  </td>
                  <td className="px-6 py-4 space-y-1">
                    {inv.customers ? (
                      <span className="flex items-center gap-1 text-on-surface font-semibold">
                        <User className="w-3.5 h-3.5 text-primary/70" />
                        {(inv.customers as any).first_name} {(inv.customers as any).last_name}
                      </span>
                    ) : (
                      <span className="text-on-surface-variant/40">—</span>
                    )}
                    {inv.pets && (
                      <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/50">
                        <Heart className="w-3 h-3 text-primary/55" />
                        Patient: {(inv.pets as any).name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 font-bold text-on-surface">
                    ${Number(inv.total).toFixed(2)}
                    <span className="block text-[9px] font-normal text-on-surface-variant/50">
                      Sub: ${Number(inv.subtotal).toFixed(2)} • Tax: ${Number(inv.tax_amount).toFixed(2)}
                    </span>
                  </td>
                  <td className="px-6 py-4">
                    {inv.payment_status === 'paid' ? (
                      <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        <CheckCircle2 className="w-3 h-3" />
                        Paid
                      </span>
                    ) : (
                      <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                        Unpaid
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 text-on-surface-variant/50 font-semibold">
                    <span className="flex items-center gap-1">
                      <Calendar className="w-3.5 h-3.5" />
                      {new Date(inv.created_at).toLocaleDateString()}
                    </span>
                  </td>
                  <td className="px-6 py-4 text-right">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline border border-primary-teal/10 hover:bg-primary/5 px-2.5 py-1.5 rounded-lg transition-all"
                    >
                      <Eye className="w-3.5 h-3.5" />
                      View Details
                    </Link>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      ) : (
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center">
          <Receipt className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
          <h4 className="text-sm font-bold text-on-surface mb-1">No Invoices Found</h4>
          <p className="text-xs text-on-surface-variant/60">
            Discharge completed patient cases in the walk-in queue to generate billing invoices.
          </p>
        </div>
      )}

    </div>
  );
}

