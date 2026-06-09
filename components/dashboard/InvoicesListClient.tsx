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
  FileText,
  Search,
} from 'lucide-react';
import {
  updateInvoicePaymentStatusAction,
  resendInvoiceEmailAction,
} from '@/lib/services/billing-actions';

export type InvoiceRow = {
  id: string;
  invoice_number: string;
  visit_id: string | null;
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
  const [search, setSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [actingId, setActingId] = useState<string | null>(null);
  const [message, setMessage] = useState<string | null>(null);
  const [, startTransition] = useTransition();

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return invoices.filter((inv) => {
      if (statusFilter !== 'all' && inv.payment_status !== statusFilter) return false;
      const d = inv.created_at.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (!q) return true;
      return (
        inv.customerName.toLowerCase().includes(q) ||
        inv.petName.toLowerCase().includes(q) ||
        inv.invoice_number.toLowerCase().includes(q)
      );
    });
  }, [invoices, statusFilter, search, dateFrom, dateTo]);

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

      <div className="flex flex-wrap gap-2 items-center">
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

      <div className="flex flex-wrap gap-2">
        <div className="relative flex-1 min-w-[200px]">
          <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-3.5 h-3.5 text-on-surface-variant" />
          <input
            type="search"
            value={search}
            onChange={(e) => setSearch(e.target.value)}
            placeholder="Search owner, pet, or invoice #..."
            className="w-full pl-9 pr-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface outline-none focus:border-primary"
          />
        </div>
        <input
          type="date"
          value={dateFrom}
          onChange={(e) => setDateFrom(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface outline-none"
          aria-label="From date"
        />
        <input
          type="date"
          value={dateTo}
          onChange={(e) => setDateTo(e.target.value)}
          className="px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface outline-none"
          aria-label="To date"
        />
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
                      className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/10 px-2 py-1 rounded-lg"
                    >
                      <Printer className="w-3 h-3" />
                      Invoice
                    </a>
                    {inv.visit_id && (
                      <a
                        href={`/api/visits/${inv.visit_id}/treatment-pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-secondary border border-secondary/20 px-2 py-1 rounded-lg"
                      >
                        <FileText className="w-3 h-3" />
                        Treatment
                      </a>
                    )}
                    {inv.payment_status !== 'paid' && (
                      <button
                        type="button"
                        disabled={actingId === inv.id}
                        onClick={() => handleMarkPaid(inv.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-emerald-500 border border-emerald-500/20 px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        {actingId === inv.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <CheckCircle2 className="w-3 h-3" />
                        )}
                        Mark paid
                      </button>
                    )}
                    {inv.customerEmail && inv.payment_status === 'paid' && (
                      <button
                        type="button"
                        disabled={actingId === inv.id}
                        onClick={() => handleResendEmail(inv.id)}
                        className="inline-flex items-center gap-1 text-[10px] font-bold text-on-surface-variant border border-outline-variant px-2 py-1 rounded-lg disabled:opacity-50"
                      >
                        {actingId === inv.id ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          <Mail className="w-3 h-3" />
                        )}
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
          <p className="text-xs text-on-surface-variant text-center py-12">
            No invoices match your filters.
          </p>
        )}
      </div>
    </div>
  );
}
