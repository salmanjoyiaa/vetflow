'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { adjustStockAction } from '@/lib/services/inventory-actions';
import { StockAdjustmentSchema, type StockAdjustmentInput } from '@/lib/validations/schemas';
import { Loader2, ArrowUpDown, X } from 'lucide-react';

interface StockAdjustmentFormProps {
  productId: string;
  productName: string;
  branchId: string;
  currentStock: number;
}

export default function StockAdjustmentForm({
  productId,
  productName,
  branchId,
  currentStock,
}: StockAdjustmentFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<StockAdjustmentInput>({
    resolver: zodResolver(StockAdjustmentSchema),
    defaultValues: {
      productId,
      branchId,
      quantity: 0,
    },
  });

  const onSubmit = async (data: StockAdjustmentInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await adjustStockAction(data);
      if (res.success) {
        reset();
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to adjust stock balance');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/30 px-2 py-1.5 rounded-lg hover:bg-primary/10 transition-all"
        title="Adjust stock balance"
      >
        <ArrowUpDown className="w-3 h-3" />
        Adjust Stock
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-sm rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-on-surface mb-1">Adjust Inventory</h3>
            <p className="text-xs text-on-surface-variant/60 mb-4 truncate">Product: {productName}</p>

            <div className="bg-surface-container/40 p-3.5 rounded-xl border border-outline-variant/40 text-xs mb-4 flex justify-between font-semibold">
              <span className="text-on-surface-variant/60">Current Stock:</span>
              <span className="text-on-surface font-bold">{currentStock} units</span>
            </div>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Adjustment Quantity
                </label>
                <input
                  type="number"
                  {...register('quantity', { valueAsNumber: true })}
                  placeholder="e.g. +10 or -5"
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-bold"
                  required
                />
                <span className="text-[9px] text-on-surface-variant/50 block mt-1">Use negative values to subtract stock.</span>
                {errors.quantity && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.quantity.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Adjustment Reason/Type
                </label>
                <select
                  {...register('type')}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-bold"
                >
                  <option value="manual_adjustment">Manual Adjustment</option>
                  <option value="purchase_added">Purchase Intake</option>
                  <option value="expired_removed">Expired Stock Removal</option>
                  <option value="return">Customer Return</option>
                </select>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Explanation / Notes
                </label>
                <input
                  type="text"
                  {...register('reason')}
                  placeholder="e.g. Discarded expired batch #104"
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl text-xs text-on-surface outline-none"
                  required
                />
                {errors.reason && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.reason.message}</span>
                )}
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 border border-outline-variant hover:bg-surface-container/50 py-2.5 rounded-xl text-xs font-semibold text-on-surface transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 bg-primary hover:opacity-90 text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Adjusting...
                    </>
                  ) : (
                    'Apply Adjustment'
                  )}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

