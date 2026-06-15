'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateInvoicePaymentStatusAction } from '@/lib/services/billing-actions';
import { Loader2, CheckCircle2 } from 'lucide-react';

interface InvoicePaymentActionsProps {
  invoiceId: string;
  invoiceTotal: number;
  amountPaid: number;
  paymentStatus: string;
}

export default function InvoicePaymentActions({
  invoiceId,
  invoiceTotal,
  amountPaid,
  paymentStatus,
}: InvoicePaymentActionsProps) {
  const router = useRouter();
  const [amount, setAmount] = useState('');
  const [paymentMethod, setPaymentMethod] = useState<'cash' | 'card' | 'bank_transfer'>('cash');
  const [message, setMessage] = useState<string | null>(null);
  const [isPending, startTransition] = useTransition();

  const remaining = Math.max(0, invoiceTotal - amountPaid);

  if (paymentStatus === 'paid' || remaining <= 0) {
    return null;
  }

  const handlePay = () => {
    const payAmount = amount ? parseFloat(amount) : remaining;
    if (!payAmount || payAmount <= 0 || payAmount > remaining + 0.001) {
      setMessage(`Enter an amount between $0.01 and $${remaining.toFixed(2)}`);
      return;
    }
    setMessage(null);
    startTransition(async () => {
      const res = await updateInvoicePaymentStatusAction({
        invoiceId,
        paymentMethod,
        paymentReference: '',
        amount: payAmount,
      });
      if (res.success) {
        setAmount('');
        router.refresh();
      } else {
        setMessage(res.error || 'Payment failed');
      }
    });
  };

  return (
    <div className="glass-panel p-6 space-y-4">
      <h3 className="text-sm font-bold text-on-surface">Record payment</h3>
      <p className="text-xs text-on-surface-variant">
        Remaining balance: <span className="font-bold text-amber-400">${remaining.toFixed(2)}</span>
      </p>
      {message && (
        <p className="text-xs text-destructive">{message}</p>
      )}
      <div className="grid sm:grid-cols-2 gap-3">
        <div>
          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
            Amount ($)
          </label>
          <input
            type="number"
            step="0.01"
            min={0.01}
            max={remaining}
            value={amount}
            onChange={(e) => setAmount(e.target.value)}
            placeholder={remaining.toFixed(2)}
            className="w-full px-3 py-2 border border-outline-variant rounded-xl text-xs"
          />
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase mb-1">
            Method
          </label>
          <select
            value={paymentMethod}
            onChange={(e) => setPaymentMethod(e.target.value as typeof paymentMethod)}
            className="w-full px-3 py-2 border border-outline-variant rounded-xl text-xs font-bold"
          >
            <option value="cash">Cash</option>
            <option value="card">Card</option>
            <option value="bank_transfer">Bank transfer</option>
          </select>
        </div>
      </div>
      <button
        type="button"
        onClick={handlePay}
        disabled={isPending}
        className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold disabled:opacity-60"
      >
        {isPending ? (
          <>
            <Loader2 className="w-4 h-4 animate-spin" />
            Processing…
          </>
        ) : (
          <>
            <CheckCircle2 className="w-4 h-4" />
            {amount ? 'Record partial payment' : 'Pay remaining balance'}
          </>
        )}
      </button>
    </div>
  );
}
