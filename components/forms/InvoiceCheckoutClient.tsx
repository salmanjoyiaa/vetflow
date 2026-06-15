'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { createInvoiceFromVisitAction } from '@/lib/services/billing-actions';
import { useCurrency } from '@/lib/context/CurrencyContext';
import { CheckoutSchema, type CheckoutInput } from '@/lib/validations/schemas';
import {
  User,
  Heart,
  Loader2,
  FileSpreadsheet,
  CheckCircle,
  Printer,
  Pill,
  FileText,
  Mail,
  Phone,
} from 'lucide-react';

interface BillingItem {
  name: string;
  quantity: number;
  unitPrice: number;
  type: string;
}

interface InvoiceCheckoutClientProps {
  visitId: string;
  pet: { name: string; species: string; breed: string | null };
  customer: { firstName: string; lastName: string; phone: string; email?: string | null };
  items: BillingItem[];
  taxPercentage: number;
  taxName: string;
  appliesToProducts: boolean;
  appliesToServices: boolean;
  prescriptionId?: string | null;
  clinicalNotesId?: string | null;
}

export default function InvoiceCheckoutClient({
  visitId,
  pet,
  customer,
  items,
  taxPercentage,
  taxName,
  appliesToProducts,
  appliesToServices,
  prescriptionId,
}: InvoiceCheckoutClientProps) {
  const router = useRouter();
  const { formatCurrency } = useCurrency();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [completed, setCompleted] = useState<{
    invoiceId: string;
    prescriptionId: string | null;
  } | null>(null);

  const {
    register,
    handleSubmit,
    watch,
    formState: { errors },
  } = useForm<CheckoutInput>({
    resolver: zodResolver(CheckoutSchema),
    defaultValues: {
      visitId,
      discount: 0,
      paymentStatus: 'paid',
      paymentMethod: 'cash',
      paymentReference: '',
      notes: '',
      sendEmailReceipt: false,
    },
  });

  const discountWatch = watch('discount') || 0;
  const paymentStatusWatch = watch('paymentStatus');
  const amountPaidWatch = watch('amountPaid') || 0;
  const sendEmailWatch = watch('sendEmailReceipt');

  let subtotal = 0;
  let taxAmountTotal = 0;

  const invoiceItems = items.map((item) => {
    const itemSub = item.quantity * item.unitPrice;
    subtotal += itemSub;

    let applies = false;
    if (taxPercentage > 0) {
      if (item.type === 'service' && appliesToServices) applies = true;
      if (item.type !== 'service' && appliesToProducts) applies = true;
    }

    const itemTax = applies ? itemSub * (taxPercentage / 100) : 0;
    taxAmountTotal += itemTax;

    return {
      name: item.name,
      quantity: item.quantity,
      unitPrice: item.unitPrice,
      total: itemSub + itemTax,
    };
  });

  const totalBeforeDiscount = subtotal + taxAmountTotal;
  const total = Math.max(0, totalBeforeDiscount - discountWatch);

  const onSubmit = async (data: CheckoutInput) => {
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createInvoiceFromVisitAction(data);
      if (res.success && res.invoiceId) {
        setCompleted({
          invoiceId: res.invoiceId,
          prescriptionId: res.prescriptionId || prescriptionId || null,
        });
        router.replace(`/dashboard/invoices/${res.invoiceId}`);
      } else {
        setError(res.error || 'Failed to complete billing transaction.');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (completed) {
    return (
      <div className="glass-panel rounded-2xl border border-emerald-500/30 p-8 space-y-6 shadow-premium">
        <div className="flex items-center gap-3">
          <CheckCircle className="w-8 h-8 text-emerald-500" />
          <div>
            <h3 className="text-lg font-bold text-on-surface">Checkout complete</h3>
            <p className="text-xs text-on-surface-variant">
              Invoice created for {pet.name}. Print documents or return to the queue.
            </p>
          </div>
        </div>

        <div className="grid sm:grid-cols-2 md:grid-cols-4 gap-3">
          <a
            href={`/api/invoices/${completed.invoiceId}/pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-xs font-bold text-on-surface hover:border-primary"
          >
            <Printer className="w-4 h-4 text-primary" />
            Print invoice
          </a>
          {completed.prescriptionId && (
            <a
              href={`/api/prescriptions/${completed.prescriptionId}/pdf`}
              target="_blank"
              rel="noopener noreferrer"
              className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-xs font-bold text-on-surface hover:border-primary"
            >
              <Pill className="w-4 h-4 text-primary" />
              Print prescription
            </a>
          )}
          <a
            href={`/api/visits/${visitId}/treatment-pdf`}
            target="_blank"
            rel="noopener noreferrer"
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl border border-outline-variant bg-surface-container text-xs font-bold text-on-surface hover:border-primary"
          >
            <FileText className="w-4 h-4 text-primary" />
            Treatment summary
          </a>
          <button
            type="button"
            onClick={() => router.push('/dashboard/invoices')}
            className="flex items-center justify-center gap-2 px-4 py-3 rounded-xl bg-primary text-white text-xs font-bold"
          >
            View all invoices
          </button>
        </div>
      </div>
    );
  }

  return (
    <div className="grid md:grid-cols-12 gap-8 items-start">
      <div className="md:col-span-8 space-y-6">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium">
          <div className="flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
              <Heart className="w-5 h-5 text-primary" />
            </div>
            <div>
              <h3 className="text-sm font-bold text-on-surface">{pet.name}</h3>
              <p className="text-[10px] text-on-surface-variant">
                {pet.species}
                {pet.breed ? ` · ${pet.breed}` : ''}
              </p>
              <p className="text-[10px] text-on-surface-variant flex items-center gap-1 mt-0.5">
                <User className="w-3 h-3" />
                {customer.firstName} {customer.lastName}
                <Phone className="w-3 h-3 ml-2" />
                {customer.phone}
              </p>
            </div>
          </div>
        </div>

        <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
          <div className="p-5 border-b border-outline-variant/30 bg-surface-container/20">
            <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-primary" />
              Billing items
            </h3>
          </div>
          <table className="w-full text-left border-collapse">
            <thead>
              <tr className="bg-surface-container/10 border-b border-outline-variant/40 text-[9px] font-bold text-on-surface/80 uppercase tracking-wider">
                <th className="px-6 py-3">Description</th>
                <th className="px-6 py-3">Qty</th>
                <th className="px-6 py-3">Unit price</th>
                <th className="px-6 py-3 text-right">Total</th>
              </tr>
            </thead>
            <tbody className="divide-y divide-border/20 text-xs">
              {invoiceItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-surface-container/10">
                  <td className="px-6 py-4 font-bold text-on-surface">{item.name}</td>
                  <td className="px-6 py-4 text-on-surface-variant/60">{item.quantity}</td>
                  <td className="px-6 py-4 text-on-surface-variant/60">
                    {formatCurrency(item.unitPrice)}
                  </td>
                  <td className="px-6 py-4 text-right font-semibold text-on-surface">
                    {formatCurrency(item.total)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      <div className="md:col-span-4 space-y-6">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-5">
          <span className="text-[10px] font-black text-primary uppercase tracking-wider block">
            Checkout hub
          </span>
          <h3 className="text-base font-bold text-on-surface">Payment & discharge</h3>

          {error && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Payment status
              </label>
              <div className="grid grid-cols-3 gap-2">
                <label
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border ${
                    paymentStatusWatch === 'paid'
                      ? 'bg-primary text-white border-primary'
                      : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <input type="radio" value="paid" {...register('paymentStatus')} className="sr-only" />
                  Paid now
                </label>
                <label
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border ${
                    paymentStatusWatch === 'partial'
                      ? 'bg-sky-500 text-white border-sky-500'
                      : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <input type="radio" value="partial" {...register('paymentStatus')} className="sr-only" />
                  Partial
                </label>
                <label
                  className={`flex items-center justify-center gap-1 px-3 py-2 rounded-xl text-xs font-bold cursor-pointer border ${
                    paymentStatusWatch === 'unpaid'
                      ? 'bg-amber-500 text-white border-amber-500'
                      : 'border-outline-variant text-on-surface-variant'
                  }`}
                >
                  <input type="radio" value="unpaid" {...register('paymentStatus')} className="sr-only" />
                  Pay later
                </label>
              </div>
            </div>

            {(paymentStatusWatch === 'paid' || paymentStatusWatch === 'partial') && (
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Payment method
                </label>
                <select
                  {...register('paymentMethod')}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl text-xs text-on-surface font-bold outline-none"
                >
                  <option value="cash">Cash</option>
                  <option value="card">Card</option>
                  <option value="bank_transfer">Bank transfer</option>
                </select>
              </div>
            )}

            {paymentStatusWatch === 'partial' && (
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Amount paid now ({formatCurrency(total)} total)
                </label>
                <input
                  type="number"
                  step="0.01"
                  min={0.01}
                  max={total - 0.01}
                  {...register('amountPaid', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs font-bold outline-none"
                />
                {amountPaidWatch > 0 && amountPaidWatch < total && (
                  <p className="text-[10px] text-on-surface-variant mt-1">
                    Remaining balance: {formatCurrency(total - amountPaidWatch)}
                  </p>
                )}
              </div>
            )}

            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Reference / notes
              </label>
              <input
                type="text"
                {...register('paymentReference')}
                placeholder="Card auth code, tx ID..."
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs text-on-surface outline-none"
              />
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                Discount
              </label>
              <input
                type="number"
                step="0.01"
                {...register('discount', { valueAsNumber: true })}
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs font-bold outline-none"
              />
              {errors.discount && (
                <p className="text-[10px] text-destructive mt-1">{errors.discount.message}</p>
              )}
            </div>

            <div className="pt-4 border-t border-outline-variant/40 space-y-2 text-xs">
              <div className="flex justify-between text-on-surface-variant/60">
                <span>Subtotal</span>
                <span>{formatCurrency(subtotal)}</span>
              </div>
              {discountWatch > 0 && (
                <div className="flex justify-between text-destructive font-semibold">
                  <span>Discount</span>
                  <span>-{formatCurrency(Number(discountWatch))}</span>
                </div>
              )}
              {taxPercentage > 0 && (
                <div className="flex justify-between text-on-surface-variant/60">
                  <span>
                    {taxName} ({taxPercentage}%)
                  </span>
                  <span>{formatCurrency(taxAmountTotal)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-on-surface pt-2 border-t border-outline-variant/20">
                <span>Total due</span>
                <span className="text-primary">{formatCurrency(total)}</span>
              </div>
            </div>

            {customer.email && (
              <label className="flex items-center gap-2 text-xs text-on-surface-variant cursor-pointer">
                <input type="checkbox" {...register('sendEmailReceipt')} className="rounded" />
                <Mail className="w-3.5 h-3.5 text-primary" />
                Email receipt to owner
                {sendEmailWatch && (
                  <span className="text-[10px] text-on-surface-variant/60">({customer.email})</span>
                )}
              </label>
            )}

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary hover:opacity-90 text-white py-3 rounded-xl text-xs font-bold shadow-premium transition-all flex items-center justify-center gap-1.5 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing…
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  {paymentStatusWatch === 'paid'
                    ? 'Record payment & close visit'
                    : paymentStatusWatch === 'partial'
                      ? 'Record partial payment & close visit'
                      : 'Save invoice (unpaid)'}
                </>
              )}
            </button>
          </form>
        </div>
      </div>
    </div>
  );
}
