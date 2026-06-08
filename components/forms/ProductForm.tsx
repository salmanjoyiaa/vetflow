'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createProductAction } from '@/lib/services/inventory-actions';
import { ProductSchema, type ProductInput } from '@/lib/validations/schemas';
import Modal from '@/components/ui/premium/Modal';
import Button from '@/components/ui/premium/Button';
import Select from '@/components/ui/premium/Select';
import { Plus, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductFormProps {
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  activeBranchId?: string;
}

export default function ProductForm({ categories, branches, activeBranchId }: ProductFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [showAdvanced, setShowAdvanced] = useState(false);
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
      type: 'service',
      unit: 'pcs',
      stockQuantity: 0,
      reorderLevel: 5,
      purchasePrice: 0,
      sellingPrice: 0,
    },
  });

  const typeWatch = watch('type');
  const branchIdWatch = watch('branchId');

  const onSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createProductAction(data);
      if (res.success) {
        reset();
        setIsOpen(false);
        setShowAdvanced(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to add product');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
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
        description="Quick-add a service or product. Category is optional — type a new name or leave blank."
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {error && (
            <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Item name
              </label>
              <input
                type="text"
                {...register('name')}
                placeholder="e.g. Consultation, Amoxicillin 250mg"
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-semibold"
              />
              {errors.name && (
                <span className="text-[10px] text-destructive mt-1 block">{errors.name.message}</span>
              )}
            </div>

            <div className="grid grid-cols-2 gap-4">
              <Select
                label="Type"
                value={typeWatch}
                onChange={(v) => setValue('type', v as ProductInput['type'])}
                options={[
                  { value: 'service', label: 'Service' },
                  { value: 'medicine', label: 'Medicine' },
                  { value: 'food', label: 'Food' },
                  { value: 'accessory', label: 'Accessory' },
                ]}
              />
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Selling price ($)
                </label>
                <input
                  type="number"
                  step="0.01"
                  {...register('sellingPrice', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl outline-none text-xs text-on-surface font-bold"
                />
              </div>
            </div>

            <Select
              label="Branch"
              value={branchIdWatch}
              onChange={(v) => setValue('branchId', v)}
              options={branches.map((b) => ({ value: b.id, label: b.name }))}
            />

            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Category (optional)
              </label>
              <input
                type="text"
                {...register('categoryName')}
                placeholder="e.g. Services, Medicines — creates if new"
                list="product-category-suggestions"
                className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl outline-none text-xs text-on-surface"
              />
              <datalist id="product-category-suggestions">
                {categories.map((c) => (
                  <option key={c.id} value={c.name} />
                ))}
              </datalist>
            </div>

            {typeWatch !== 'service' && (
              <div>
                <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                  Initial stock quantity
                </label>
                <input
                  type="number"
                  {...register('stockQuantity', { valueAsNumber: true })}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl outline-none text-xs text-on-surface"
                />
              </div>
            )}

            <button
              type="button"
              onClick={() => setShowAdvanced((s) => !s)}
              className="text-[10px] font-semibold text-primary flex items-center gap-1"
            >
              {showAdvanced ? <ChevronUp className="w-3 h-3" /> : <ChevronDown className="w-3 h-3" />}
              Advanced fields
            </button>

            {showAdvanced && (
              <div className="space-y-3 pt-2 border-t border-outline-variant/30">
                <input type="hidden" {...register('categoryId')} />
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="text"
                    {...register('brand')}
                    placeholder="Brand"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface"
                  />
                  <input
                    type="text"
                    {...register('sku')}
                    placeholder="SKU"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface"
                  />
                </div>
                <div className="grid grid-cols-2 gap-3">
                  <input
                    type="number"
                    step="0.01"
                    {...register('purchasePrice', { valueAsNumber: true })}
                    placeholder="Purchase price"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface"
                  />
                  <input
                    type="number"
                    {...register('reorderLevel', { valueAsNumber: true })}
                    placeholder="Reorder level"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface"
                  />
                </div>
              </div>
            )}

            <div className="flex gap-3 pt-2">
              <Button type="button" variant="secondary" className="w-1/2" onClick={() => setIsOpen(false)}>
                Cancel
              </Button>
              <Button type="submit" className="w-1/2" loading={isLoading}>
                Add item
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
