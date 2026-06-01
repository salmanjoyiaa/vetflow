'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { ProductSchema, type ProductInput, createProductAction } from '@/lib/services/inventory-actions';
import { Loader2, Plus, X } from 'lucide-react';

interface ProductFormProps {
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  activeBranchId?: string;
}

export default function ProductForm({ categories, branches, activeBranchId }: ProductFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    setValue,
    watch,
    reset,
    formState: { errors },
  } = useForm<ProductInput>({
    resolver: zodResolver(ProductSchema),
    defaultValues: {
      branchId: activeBranchId || (branches.length > 0 ? branches[0].id : ''),
      type: 'medicine',
      unit: 'pcs',
      stockQuantity: 0,
      reorderLevel: 5,
      purchasePrice: 0,
      sellingPrice: 0,
    },
  });

  const typeWatch = watch('type');

  const onSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createProductAction(data);
      if (res.success) {
        reset();
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to add product');
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
        className="bg-primary-teal hover:bg-primary-teal/95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
      >
        <Plus className="w-4 h-4" />
        Add Catalog Item
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-primary-navy/40 backdrop-blur-xs">
          <div className="bg-white w-full max-w-lg rounded-2xl shadow-premium border border-border/40 p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-graphite/40 hover:text-graphite transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-primary-navy mb-1">Create Catalog Item</h3>
            <p className="text-xs text-graphite/60 mb-6">Register a new product, medicine, or clinic service.</p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Item Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Amoxicillin 250mg"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy font-semibold"
                  />
                  {errors.name && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.name.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    {...register('brand')}
                    placeholder="e.g. VetMed Labs"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <select
                    {...register('type')}
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy font-bold"
                  >
                    <option value="medicine">Medicine</option>
                    <option value="food">Food</option>
                    <option value="accessory">Accessory</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Unit
                  </label>
                  <input
                    type="text"
                    {...register('unit')}
                    placeholder="e.g. tablet, vial, pack"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.unit && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.unit.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
                    placeholder="e.g. AMX-250"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Purchase Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('purchasePrice', { valueAsNumber: true })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                  />
                  {errors.purchasePrice && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.purchasePrice.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Selling Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('sellingPrice', { valueAsNumber: true })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy font-bold"
                  />
                  {errors.sellingPrice && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.sellingPrice.message}</span>
                  )}
                </div>
              </div>

              {typeWatch !== 'service' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                      Initial Quantity in Stock
                    </label>
                    <input
                      type="number"
                      {...register('stockQuantity', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy font-bold"
                    />
                    {errors.stockQuantity && (
                      <span className="text-[10px] text-destructive mt-1 block">{errors.stockQuantity.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                      Low Stock Reorder Level
                    </label>
                    <input
                      type="number"
                      {...register('reorderLevel', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy"
                    />
                    {errors.reorderLevel && (
                      <span className="text-[10px] text-destructive mt-1 block">{errors.reorderLevel.message}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Category Link
                  </label>
                  <select
                    {...register('categoryId')}
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy font-semibold"
                  >
                    <option value="">-- None --</option>
                    {categories.map((c) => (
                      <option key={c.id} value={c.id}>
                        {c.name}
                      </option>
                    ))}
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
                    Target Branch
                  </label>
                  <select
                    {...register('branchId')}
                    className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl outline-none text-xs text-primary-navy font-semibold"
                  >
                    {branches.map((b) => (
                      <option key={b.id} value={b.id}>
                        {b.name}
                      </option>
                    ))}
                  </select>
                </div>
              </div>

              <div className="flex gap-3 pt-2">
                <button
                  type="button"
                  onClick={() => setIsOpen(false)}
                  className="w-1/2 border border-border hover:bg-primary-ivory/50 py-2.5 rounded-xl text-xs font-semibold text-primary-navy transition-all"
                >
                  Cancel
                </button>
                <button
                  type="submit"
                  disabled={isLoading}
                  className="w-1/2 bg-primary-navy hover:bg-primary-teal text-white py-2.5 rounded-xl text-xs font-semibold shadow-sm transition-all flex items-center justify-center gap-1.5"
                >
                  {isLoading ? (
                    <>
                      <Loader2 className="w-3.5 h-3.5 animate-spin" />
                      Saving...
                    </>
                  ) : (
                    'Add Product'
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
