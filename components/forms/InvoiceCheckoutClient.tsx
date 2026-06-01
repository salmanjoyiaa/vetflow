'use client';

import { useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { CheckoutSchema, type CheckoutInput, createInvoiceFromVisitAction } from '@/lib/services/billing-actions';
import { 
  Receipt, 
  User, 
  Heart, 
  Loader2, 
  MapPin, 
  FileSpreadsheet, 
  CheckCircle,
  FileCheck2,
  DollarSign
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
  customer: { firstName: string; lastName: string; phone: string };
  items: BillingItem[];
  taxPercentage: number;
  taxName: string;
  appliesToProducts: boolean;
  appliesToServices: boolean;
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
}: InvoiceCheckoutClientProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);

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
      paymentMethod: 'cash',
      paymentReference: '',
      notes: '',
    },
  });

  const discountWatch = watch('discount') || 0;

  // Real-time client-side calculation preview (matches server calculations)
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

    const itemTax = applies ? (itemSub * (taxPercentage / 100)) : 0;
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
      if (res.success) {
        router.push('/dashboard/invoices');
        router.refresh();
      } else {
        setError(res.error || 'Failed to complete billing transaction.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsSubmitting(false);
    }
  };

  return (
    <div className="grid md:grid-cols-12 gap-8 items-start">
      
      {/* LEFT: BILLING ITEMS MATRIX */}
      <div className="md:col-span-8 space-y-6">
        <div className="bg-white rounded-2xl border border-border/40 overflow-hidden shadow-premium">
          <div className="p-5 border-b border-border/30 bg-primary-ivory/20">
            <h3 className="text-sm font-bold text-primary-navy uppercase tracking-wider flex items-center gap-1.5">
              <FileSpreadsheet className="w-4.5 h-4.5 text-primary-teal" />
              Billing Ledger Items
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
              {invoiceItems.map((item, idx) => (
                <tr key={idx} className="hover:bg-primary-ivory/10">
                  <td className="px-6 py-4 font-bold text-primary-navy">{item.name}</td>
                  <td className="px-6 py-4 text-graphite/60">{item.quantity}</td>
                  <td className="px-6 py-4 text-graphite/60">${item.unitPrice.toFixed(2)}</td>
                  <td className="px-6 py-4 text-right font-semibold text-primary-navy">
                    ${item.total.toFixed(2)}
                  </td>
                </tr>
              ))}
            </tbody>
          </table>
        </div>
      </div>

      {/* RIGHT: CHECKOUT ACTION PANEL */}
      <div className="md:col-span-4 space-y-6">
        
        {/* CHECKOUT CARD */}
        <div className="bg-white rounded-2xl border border-border/40 p-6 shadow-premium space-y-5">
          <span className="text-[10px] font-black text-primary-teal uppercase tracking-wider block mb-1">
            Payment Discharge
          </span>
          <h3 className="text-base font-bold text-primary-navy">Checkout Billing</h3>

          {error && (
            <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            
            <div>
              <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                Payment Method
              </label>
              <select
                {...register('paymentMethod')}
                className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy font-bold outline-none"
              >
                <option value="cash">Cash</option>
                <option value="card">Card Payment</option>
                <option value="bank_transfer">Bank Transfer</option>
              </select>
            </div>

            <div>
              <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                Reference Code / Notes
              </label>
              <input
                type="text"
                {...register('paymentReference')}
                placeholder="e.g. Card Auth Code / Tx ID"
                className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
              />
            </div>

            <div className="grid grid-cols-2 gap-4">
              <div>
                <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                  Discount ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('discount', { valueAsNumber: true })}
                  placeholder="0.00"
                  className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none font-bold"
                />
              </div>
              <div className="flex flex-col justify-end">
                <span className="text-[10px] text-graphite/45 mb-1.5">Calculated Tax ({taxName}):</span>
                <span className="text-xs font-bold text-primary-navy">${taxAmountTotal.toFixed(2)}</span>
              </div>
            </div>

            {/* PREVIEW LEDGER TOTALS */}
            <div className="pt-4 border-t border-border/40 space-y-2 text-xs">
              <div className="flex justify-between text-graphite/60">
                <span>Subtotal:</span>
                <span>${subtotal.toFixed(2)}</span>
              </div>
              {discountWatch > 0 && (
                <div className="flex justify-between text-destructive font-semibold">
                  <span>Discount:</span>
                  <span>-${Number(discountWatch).toFixed(2)}</span>
                </div>
              )}
              {taxPercentage > 0 && (
                <div className="flex justify-between text-graphite/60">
                  <span>Tax ({taxPercentage}%):</span>
                  <span>${taxAmountTotal.toFixed(2)}</span>
                </div>
              )}
              <div className="flex justify-between text-base font-black text-primary-navy pt-2 border-t border-border/20">
                <span>Total Due:</span>
                <span className="text-primary-teal">${total.toFixed(2)}</span>
              </div>
            </div>

            <button
              type="submit"
              disabled={isSubmitting}
              className="w-full bg-primary-navy hover:bg-primary-teal text-white py-3 rounded-xl text-xs font-bold shadow-premium transition-all flex items-center justify-center gap-1.5 disabled:opacity-75"
            >
              {isSubmitting ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Processing Checkout...
                </>
              ) : (
                <>
                  <CheckCircle className="w-4 h-4" />
                  Record Payment & Close Visit
                </>
              )}
            </button>

          </form>
        </div>

      </div>

    </div>
  );
}
