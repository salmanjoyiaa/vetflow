import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import { createClient } from '@/lib/supabase/server';
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
  title: 'VetFlow Invoice Details',
  description: 'View transaction details and download invoice printout.',
};

export default async function InvoiceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const session = await resolveServerSession();
  if (!session) {
    redirect('/login');
  }

  const supabase = await createClient();

  // Fetch invoice details with joins
  const { data: invoice, error } = await supabase
    .from('invoices')
    .select(`
      *,
      invoice_items ( * ),
      customers ( id, first_name, last_name, phone, email ),
      pets ( id, name, species ),
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
      
      {/* BACK BUTTON */}
      <div className="space-y-2">
        <Link 
          href="/dashboard/invoices" 
          className="inline-flex items-center gap-1.5 text-xs text-graphite/60 hover:text-primary-teal font-semibold transition-colors"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to Invoices
        </Link>
        
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
          <h2 className="text-xl font-black text-primary-navy tracking-tight flex items-center gap-2">
            <Receipt className="w-5 h-5 text-primary-teal" />
            Invoice Receipt: {invoice.invoice_number}
          </h2>

          <div className="flex gap-3">
            <a
              href={`/api/invoices/${invoice.id}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="bg-primary-teal hover:bg-primary-teal/95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
            >
              <Printer className="w-4 h-4" />
              Print Receipt PDF
            </a>

            {prescription && (
              <a
                href={`/api/prescriptions/${prescription.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="border border-primary-teal/30 hover:bg-primary-teal/5 text-primary-teal px-4 py-2.5 rounded-xl text-xs font-semibold transition-all flex items-center gap-2"
              >
                <FileCheck2 className="w-4 h-4" />
                Print Prescription PDF
              </a>
            )}
          </div>
        </div>
      </div>

      {/* INVOICE DETAILS GRID */}
      <div className="grid md:grid-cols-12 gap-8 items-start">
        
        {/* LEFT: GENERAL METADATA CARD */}
        <div className="md:col-span-4 space-y-6">
          <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-5">
            <div>
              <span className="text-[10px] font-bold text-primary-teal uppercase tracking-wider block mb-1">
                Statement details
              </span>
              <h3 className="text-sm font-bold text-primary-navy">Invoice Metadata</h3>
            </div>

            <div className="space-y-3.5 text-xs">
              <div className="flex justify-between text-graphite/70 pb-2 border-b border-border/30">
                <span className="font-semibold text-primary-navy">Billed To</span>
                <Link 
                  href={`/dashboard/customers/${customerObj?.id}`}
                  className="hover:text-primary-teal hover:underline"
                >
                  {customerObj?.first_name} {customerObj?.last_name}
                </Link>
              </div>
              <div className="flex justify-between text-graphite/70 pb-2 border-b border-border/30">
                <span className="font-semibold text-primary-navy">Patient</span>
                {petObj ? (
                  <Link 
                    href={`/dashboard/pets/${petObj.id}`}
                    className="hover:text-primary-teal hover:underline capitalize"
                  >
                    {petObj.name} ({petObj.species})
                  </Link>
                ) : (
                  <span>—</span>
                )}
              </div>
              <div className="flex justify-between text-graphite/70 pb-2 border-b border-border/30">
                <span className="font-semibold text-primary-navy">Clinic Site</span>
                <span>{branchObj?.name}</span>
              </div>
              <div className="flex justify-between text-graphite/70 pb-2 border-b border-border/30">
                <span className="font-semibold text-primary-navy">Created Date</span>
                <span className="flex items-center gap-1">
                  <Calendar className="w-3.5 h-3.5" />
                  {new Date(invoice.created_at).toLocaleDateString()}
                </span>
              </div>
              <div className="flex justify-between text-graphite/70">
                <span className="font-semibold text-primary-navy">Status</span>
                <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                  <CheckCircle2 className="w-3 h-3" />
                  Paid
                </span>
              </div>
            </div>
          </div>
        </div>

        {/* RIGHT: LEDGER TABLE */}
        <div className="md:col-span-8 bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
          <div className="p-5 border-b border-border/30 bg-primary-ivory/20">
            <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-primary-teal" />
              Itemized Ledger
            </h3>
          </div>

          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-primary-ivory/10 border-b border-border/40 text-[9px] font-bold text-primary-navy/80 uppercase tracking-wider">
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Unit Price</th>
                <th className="px-6 py-3 text-right">Total (Incl. Tax)</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-xs">
              {(invoice.invoice_items || []).map((item: any, idx: number) => (
                <tr key={idx} className="hover:bg-primary-ivory/10">
                  <td className="px-6 py-4 font-bold text-primary-navy">{item.name}</td>
                  <td className="px-6 py-4 text-graphite/60">{item.quantity}</td>
                  <td className="px-6 py-4 text-graphite/60">${Number(item.unit_price).toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-primary-navy">
                    ${Number(item.total).toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          {/* TOTALS PREVIEW FOOTER */}
          <div className="bg-primary-ivory/10 p-6 border-t border-border/30 flex justify-end">
            <div className="w-72 space-y-2 text-xs">
              <div className="flex justify-between text-graphite/60">
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
                <div className="flex justify-between text-graphite/60">
                  <span>Tax ({invoice.tax_percentage}%):</span>
                  <span>${Number(invoice.tax_amount).toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-primary-navy pt-2 border-t border-border/20">
                <span>Total Paid:</span>
                <span className="text-primary-teal">${Number(invoice.total).toFixed(2)}</span>
              </div>
            </div>
          </div>
        </div>

      </div>

    </div>
  );
}
