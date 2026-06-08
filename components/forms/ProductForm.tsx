'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createProductAction } from '@/lib/services/inventory-actions';
import { ProductSchema, type ProductInput } from '@/lib/validations/schemas';
import Modal from '@/components/ui/premium/Modal';
import Button from '@/components/ui/premium/Button';
import { Plus } from 'lucide-react';

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
      <Button type="button" onClick={() => setIsOpen(true)} icon={<Plus className="w-4 h-4" />}>
        Add Catalog Item
      </Button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Create Catalog Item"
        description="Register a new product, medicine, or clinic service."
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Item Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Amoxicillin 250mg"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-semibold"
                  />
                  {errors.name && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.name.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Brand / Manufacturer
                  </label>
                  <input
                    type="text"
                    {...register('brand')}
                    placeholder="e.g. VetMed Labs"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-3 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Type
                  </label>
                  <select
                    {...register('type')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-bold"
                  >
                    <option value="medicine">Medicine</option>
                    <option value="food">Food</option>
                    <option value="accessory">Accessory</option>
                    <option value="service">Service</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Unit
                  </label>
                  <input
                    type="text"
                    {...register('unit')}
                    placeholder="e.g. tablet, vial, pack"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.unit && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.unit.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    SKU Code
                  </label>
                  <input
                    type="text"
                    {...register('sku')}
                    placeholder="e.g. AMX-250"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Purchase Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('purchasePrice', { valueAsNumber: true })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.purchasePrice && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.purchasePrice.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Selling Price ($)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('sellingPrice', { valueAsNumber: true })}
                    placeholder="0.00"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-bold"
                  />
                  {errors.sellingPrice && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.sellingPrice.message}</span>
                  )}
                </div>
              </div>

              {typeWatch !== 'service' && (
                <div className="grid grid-cols-2 gap-4">
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                      Initial Quantity in Stock
                    </label>
                    <input
                      type="number"
                      {...register('stockQuantity', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-bold"
                    />
                    {errors.stockQuantity && (
                      <span className="text-[10px] text-destructive mt-1 block">{errors.stockQuantity.message}</span>
                    )}
                  </div>
                  <div>
                    <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                      Low Stock Reorder Level
                    </label>
                    <input
                      type="number"
                      {...register('reorderLevel', { valueAsNumber: true })}
                      className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                    />
                    {errors.reorderLevel && (
                      <span className="text-[10px] text-destructive mt-1 block">{errors.reorderLevel.message}</span>
                    )}
                  </div>
                </div>
              )}

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Category Link
                  </label>
                  <select
                    {...register('categoryId')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-semibold"
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
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Target Branch
                  </label>
                  <select
                    {...register('branchId')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-semibold"
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
                <Button type="button" variant="secondary" className="w-1/2" onClick={() => setIsOpen(false)}>
                  Cancel
                </Button>
                <Button type="submit" className="w-1/2" loading={isLoading}>
                  Add Product
                </Button>
              </div>
            </form>
        </div>
      </Modal>
    </>
  );
}

