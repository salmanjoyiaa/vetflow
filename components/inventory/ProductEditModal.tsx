'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { updateProductAction, createCategoryAction } from '@/lib/services/inventory-actions';
import { UpdateProductSchema, type UpdateProductInput } from '@/lib/validations/schemas';
import { PRODUCT_TYPE_OPTIONS } from '@/lib/inventory/product-types';
import { useCreatableOptions } from '@/lib/hooks/useCreatableOptions';
import Modal from '@/components/ui/premium/Modal';
import Button from '@/components/ui/premium/Button';
import Select from '@/components/ui/premium/Select';
import CreatableSelect from '@/components/ui/premium/CreatableSelect';
import { Pencil, ChevronDown, ChevronUp } from 'lucide-react';

interface ProductEditModalProps {
  product: {
    id: string;
    name: string;
    brand: string | null;
    sku: string | null;
    unit: string | null;
    type: string;
    purchase_price: number;
    selling_price: number;
    reorder_level: number;
    product_categories: { name: string } | null;
  };
  categories: { id: string; name: string }[];
  branches: { id: string; name: string }[];
  activeBranchId: string;
}

export default function ProductEditModal({
  product,
  categories,
  branches,
  activeBranchId,
}: ProductEditModalProps) {
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
  } = useForm<UpdateProductInput>({
    resolver: zodResolver(UpdateProductSchema),
    defaultValues: {
      productId: product.id,
      branchId: activeBranchId,
      name: product.name,
      brand: product.brand || '',
      sku: product.sku || '',
      unit: product.unit || 'pcs',
      type: product.type as UpdateProductInput['type'],
      purchasePrice: Number(product.purchase_price),
      sellingPrice: Number(product.selling_price),
      stockQuantity: 0,
      reorderLevel: product.reorder_level,
      categoryName: product.product_categories?.name || '',
    },
  });

  const typeWatch = watch('type');
  const branchIdWatch = watch('branchId');
  const categoryNameWatch = watch('categoryName');

  const onCreateCategory = useCallback(async (label: string) => {
    const res = await createCategoryAction(label);
    if (!res.success) throw new Error(res.error);
    return { name: res.category!.name };
  }, []);

  const { options: categoryOptions, handleCreate: handleCreateCategory } = useCreatableOptions(
    categories,
    onCreateCategory
  );

  const openModal = () => {
    reset({
      productId: product.id,
      branchId: activeBranchId,
      name: product.name,
      brand: product.brand || '',
      sku: product.sku || '',
      unit: product.unit || 'pcs',
      type: product.type as UpdateProductInput['type'],
      purchasePrice: Number(product.purchase_price),
      sellingPrice: Number(product.selling_price),
      stockQuantity: 0,
      reorderLevel: product.reorder_level,
      categoryName: product.product_categories?.name || '',
    });
    setError(null);
    setIsOpen(true);
  };

  const onSubmit = async (data: UpdateProductInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await updateProductAction(data);
      if (res.success) {
        setIsOpen(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to update product');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={openModal}
        className="inline-flex items-center gap-1 px-2.5 py-1.5 rounded-lg text-[10px] font-bold border border-outline-variant text-on-surface-variant hover:bg-surface-container/40 transition-colors"
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>

      <Modal
        open={isOpen}
        onClose={() => setIsOpen(false)}
        title="Edit Catalog Item"
        description="Update product details. Stock changes use the adjust action."
        size="lg"
      >
        <div className="max-h-[70vh] overflow-y-auto pr-1">
          {error && (
            <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
              {error}
            </div>
          )}

          <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
            <input type="hidden" {...register('productId')} />

            <div>
              <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
                Item name
              </label>
              <input
                type="text"
                {...register('name')}
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
                onChange={(v) => setValue('type', v as UpdateProductInput['type'])}
                options={PRODUCT_TYPE_OPTIONS}
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

            <CreatableSelect
              label="Category (optional)"
              value={categoryNameWatch || ''}
              onChange={(v) => setValue('categoryName', v)}
              options={categoryOptions}
              onCreateOption={handleCreateCategory}
              placeholder="Select or create category…"
            />

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
                <input type="hidden" {...register('stockQuantity', { valueAsNumber: true })} />
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
                Save changes
              </Button>
            </div>
          </form>
        </div>
      </Modal>
    </>
  );
}
