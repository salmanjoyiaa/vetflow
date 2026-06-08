'use client';

import { useMemo, useState, useTransition } from 'react';
import Link from 'next/link';
import {
  Calendar,
  User,
  Heart,
  CheckCircle2,
  Eye,
  Printer,
  Mail,
  Loader2,
  DollarSign,
} from 'lucide-react';
import {
  updateInvoicePaymentStatusAction,
  resendInvoiceEmailAction,
} from '@/lib/services/billing-actions';

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  subtotal: number;
  discount: number;
  tax_amount: number;
  total: number;
  payment_status: string;
  created_at: string;
  customerName: string;
  petName: string;
  customerEmail: string | null;
};

type StatusFilter = 'all' | 'paid' | 'unpaid';

interface InvoicesListClientProps {
  invoices: InvoiceRow[];
  initialStatus?: StatusFilter;
}

export default function InvoicesListClient({
  invoices,
  initialStatus = 'all',
}: InvoicesListClientProps) {
  const [statusFilter, setStatusFilter] = useState<StatusFilter>(initialStatus);
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    if (statusFilter === 'all') return invoices;
    return invoices.filter((inv) => inv.payment_status === statusFilter);
  }, [invoices, statusFilter]);

  const counts = useMemo(
    () => ({
      all: invoices.length,
      paid: invoices.filter((i) => i.payment_status === 'paid').length,
      unpaid: invoices.filter((i) => i.payment_status === 'unpaid').length,
    }),
    [invoices]
  );

  const handleMarkPaid = (invoiceId: string) => {
    setActingId(invoiceId);
    setMessage(null);
    startTransition(async () => {
      const res = await updateInvoicePaymentStatusAction({
        invoiceId,
        paymentMethod: 'cash',
        paymentReference: '',
      });
      if (res.success) {
        setMessage('Invoice marked as paid.');
        window.location.reload();
      } else {
        setMessage(res.error || 'Failed to mark paid');
      }
      setActingId(null);
    });
  };

  const handleResendEmail = (invoiceId: string) => {
    setActingId(invoiceId);
    setMessage(null);
    startTransition(async () => {
      const res = await resendInvoiceEmailAction(invoiceId);
      setMessage(res.success ? 'Receipt email sent.' : res.error || 'Email failed');
      setActingId(null);
    });
  };

  if (invoices.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center">
        <DollarSign className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <h4 className="text-sm font-bold text-on-surface mb-1">No Invoices Found</h4>
        <p className="text-xs text-on-surface-variant/60">
          Discharge completed patient cases in the walk-in queue to generate billing invoices.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      {message && (
        <div className="text-xs p-3 rounded-xl bg-primary/5 border border-primary/20 text-primary">
          {message}
        </div>
      )}

      <div className="flex gap-2">
        {(['all', 'unpaid', 'paid'] as const).map((s) => (
          <button
            key={s}
            type="button"
            onClick={() => setStatusFilter(s)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold capitalize transition-colors ${
              statusFilter === s
                ? 'bg-primary text-white'
                : 'bg-surface-container border border-outline-variant text-on-surface-variant'
            }`}
          >
            {s} ({counts[s]})
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
              <th className="px-6 py-4">Invoice ID</th>
              <th className="px-6 py-4">Patient / Owner</th>
              <th className="px-6 py-4">Total</th>
              <th className="px-6 py-4">Status</th>
              <th className="px-6 py-4">Date</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-xs">
            {filtered.map((inv) => (
              <tr key={inv.id} className="hover:bg-surface-container/10 transition-colors">
                <td className="px-6 py-4 font-bold text-on-surface">{inv.invoice_number}</td>
                <td className="px-6 py-4 space-y-1">
                  <span className="flex items-center gap-1 text-on-surface font-semibold">
                    <User className="w-3.5 h-3.5 text-primary/70" />
                    {inv.customerName}
                  </span>
                  <span className="flex items-center gap-1 text-[10px] text-on-surface-variant/50">
                    <Heart className="w-3 h-3 text-primary/55" />
                    {inv.petName}
                  </span>
                </td>
                <td className="px-6 py-4 font-bold text-on-surface">
                  ${Number(inv.total).toFixed(2)}
                </td>
                <td className="px-6 py-4">
                  {inv.payment_status === 'paid' ? (
                    <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-400 border border-emerald-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
                      <CheckCircle2 className="w-3 h-3" />
                      Paid
                    </span>
                  ) : (
                    <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-400 border border-amber-500/20 px-2 py-0.5 rounded-full text-[10px] font-bold">
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
                  <div className="flex items-center justify-end gap-1 flex-wrap">
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/10 px-2 py-1 rounded-lg"
                    >
                      <Eye className="w-3 h-3" />
                      View
                    </Link>
                    <a
                      href={`/api/invoices/${inv.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant border border-outline-variant px-2 py-1 rounded-lg"
                    >
                      <Printer className="w-3 h-3" />
                      PDF
                    </a>
                    {inv.payment_status !== 'paid' && (
                      <button
                        type="button"
                        disabled={actingId === inv.id}
                        onClick={() => handleMarkPaid(inv.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 border border-emerald-500/30 px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        {actingId === inv.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Mark paid
                      </button>
                    )}
                    {inv.customerEmail && (
                      <button
                        type="button"
                        disabled={actingId === inv.id}
                        onClick={() => handleResendEmail(inv.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/20 px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        <Mail className="w-3 h-3" />
                        Resend
                      </button>
                    )}
                  </div>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-xs text-on-surface-variant py-8">
            No invoices in this filter.
          </p>
        )}
      </div>
    </div>
  );
}
