import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import PageHeader from '@/components/ui/premium/PageHeader';
import InvoicePaymentActions from '@/components/dashboard/InvoicePaymentActions';
import Link from 'next/link';
import { 
  ArrowLeft, 
  Receipt, 
  Printer, 
  FileCheck2, 
  User, 
  Heart, 
  Calendar,
  FileSpreadsheet,
  CheckCircle2
} from 'lucide-react';

export const metadata = {
  title: 'Invoice Details',
  description: 'View transaction details and download invoice printout.',
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/invoices');
  if (denied) return denied;

  const session = ctx;

  const supabase = await createClient();

  // Fetch invoice details with joins
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items ( * ),
      customers ( id, first_name, last_name, phone, email ),
      pets:patients ( id, name, species ),
      branches ( name, address, phone )
    `)
    .eq('id', id)
    .eq('organization_id', session.organizationId)
    .single();

  if (error || !invoice) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Invoice record not found or access denied.
      </div>
    );
  }

  const { data: payments } = await supabase
    .from('payments')
    .select('id, amount, payment_method, created_at')
    .eq('invoice_id', invoice.id)
    .order('created_at', { ascending: true });

  const amountPaid = (payments || []).reduce((sum, p) => sum + Number(p.amount), 0);
  const invoiceTotal = Number(invoice.total);
  const remaining = Math.max(0, invoiceTotal - amountPaid);

  // Check if there is a prescription issued for this visit
  const { data: prescription } = await supabase
    .from('prescriptions')
    .select('id')
    .eq('visit_id', invoice.visit_id || '')
    .eq('is_finalized', true)
    .maybeSingle();

  const customerObj = invoice.customers as any;
  const petObj = invoice.pets as any;
  const branchObj = invoice.branches as any;

  return (
    <div className="space-y-8">
      
      <Link
        href="/dashboard/invoices"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant/60 hover:text-primary font-semibold transition-colors"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to Invoices
      </Link>

      <PageHeader
        title={`Invoice Receipt: ${invoice.invoice_number}`}
        icon={Receipt}
        actions={
          <div className="flex gap-3">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary hover:bg-primary/90 text-on-primary px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Receipt PDF
            </a>

            {prescription && (
              <a
                href={`/api/prescriptions/${prescription.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-primary/30 hover:bg-primary/5 text-primary px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                Print Prescription PDF
              </a>
            )}
          </div>
        }
      />

      {/* INVOICE DETAILS GRID */}
      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT: GENERAL METADATA CARD */}
        <div className="md:col-span-4 space-y-6">
          <div className="glass-panel p-6 space-y-5">
            <div>
              <span className="text-[10px] font-bold text-primary uppercase tracking-wider block mb-1">
                Statement details
              </span>
              <h3 className="text-sm font-bold text-on-surface">Invoice Metadata</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between text-on-surface-variant/70 pb-2 border-b border-outline-variant/30">
                <span className="font-semibold text-on-surface">Billed To</span>
                <Link 
                  href={`/dashboard/customers/${customerObj?.id}`}
                  className="hover:text-primary hover:underline"
                >
                  {customerObj?.first_name} {customerObj?.last_name}
                </Link>
              </div>
              <div className="flex justify-between text-on-surface-variant/70 pb-2 border-b border-outline-variant/30">
                <span className="font-semibold text-on-surface">Patient</span>
                {petObj ? (
                  <Link 
                     href={`/dashboard/pets/${petObj.id}`}
                     className="hover:text-primary hover:underline capitalize"
                  >
                    {petObj.name} ({petObj.species})
                  </Link>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex justify-between text-on-surface-variant/70 pb-2 border-b border-outline-variant/30">
                <span className="font-semibold text-on-surface">Clinic Site</span>
                <span>{branchObj?.name}</span>
              </div>
              <div className="flex justify-between text-on-surface-variant/70 pb-2 border-b border-outline-variant/30">
                <span className="font-semibold text-on-surface">Created Date</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(invoice.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-on-surface-variant/70">
                <span className="font-semibold text-on-surface">Status</span>
                {invoice.payment_status === 'paid' ? (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Paid
                  </span>
                ) : invoice.payment_status === 'partially_paid' ? (
                  <span className="inline-flex items-center gap-1 bg-sky-500/10 text-sky-400 border border-sky-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Partial
                  </span>
                ) : (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Unpaid
                  </span>
                )}
              </div>
            </div>
          </div>

          <InvoicePaymentActions
            invoiceId={invoice.id}
            invoiceTotal={invoiceTotal}
            amountPaid={amountPaid}
            paymentStatus={invoice.payment_status}
          />
        </div>

        {/* RIGHT: LEDGER TABLE */}
        <div className="md:col-span-8 glass-panel overflow-hidden">
          <div className="p-5 border-b border-outline-variant/30 bg-surface-container-high/40">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-primary" />
              Itemized Ledger
            </h3>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container/50 border-b border-outline-variant/40 text-[9px] font-bold text-on-surface/80 uppercase tracking-wider">
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Unit Price</th>
                <th className="px-6 py-3 text-right">Total (Incl. Tax)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/20 text-xs">
              {(invoice.invoice_items || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-surface-container-high/10">
                  <td className="px-6 py-4 font-bold text-on-surface">{item.name}</td>
                  <td className="px-6 py-4 text-on-surface-variant/70">{item.quantity}</td>
                  <td className="px-6 py-4 text-on-surface-variant/70">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-on-surface">
                    ${Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS PREVIEW FOOTER */}
          <div className="bg-surface-container-high/20 p-6 border-t border-outline-variant/30 flex justify-end">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-on-surface-variant/70">
                <span>Subtotal:</span>
                <span>${Number(invoice.subtotal).toFixed(2)}</span>
              </div>
              {Number(invoice.discount) > 0 && (
                <div className="flex justify-between text-destructive font-semibold">
                  <span>Discount:</span>
                  <span>-${Number(invoice.discount).toFixed(2)}</span>
                </div>
              )}
              {Number(invoice.tax_amount) > 0 && (
                <div className="flex justify-between text-on-surface-variant/70">
                  <span>Tax ({invoice.tax_percentage}%):</span>
                  <span>${Number(invoice.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-on-surface pt-2 border-t border-outline-variant/30">
                <span>Invoice total:</span>
                <span className="text-secondary">${invoiceTotal.toFixed(2)}</span>
              </div>
              {amountPaid > 0 && (
                <div className="flex justify-between text-emerald-400 font-semibold">
                  <span>Amount paid:</span>
                  <span>${amountPaid.toFixed(2)}</span>
                </div>
              )}
              {remaining > 0 && invoice.payment_status !== 'paid' && (
                <div className="flex justify-between text-amber-400 font-semibold">
                  <span>Remaining balance:</span>
                  <span>${remaining.toFixed(2)}</span>
                </div>
              )}
            </div>
          </div>

          {(payments || []).length > 0 && (
            <div className="px-6 py-4 border-t border-outline-variant/30 bg-surface-container/20">
              <h4 className="text-[10px] font-bold uppercase text-on-surface-variant mb-2">Payment history</h4>
              <div className="space-y-1">
                {(payments || []).map((p) => (
                  <div key={p.id} className="flex justify-between text-xs text-on-surface-variant">
                    <span className="capitalize">
                      {p.payment_method} · {new Date(p.created_at).toLocaleString()}
                    </span>
                    <span className="font-bold text-on-surface">${Number(p.amount).toFixed(2)}</span>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>

      </div>

    </div>
  );
}
