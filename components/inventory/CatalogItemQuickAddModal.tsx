'use client';

import { useState, useCallback } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createProductAction, createCategoryAction } from '@/lib/services/inventory-actions';
import { ProductSchema, type ProductInput } from '@/lib/validations/schemas';
import { PRODUCT_TYPE_OPTIONS, type ProductType } from '@/lib/inventory/product-types';
import { useCreatableOptions } from '@/lib/hooks/useCreatableOptions';
import Modal from '@/components/ui/premium/Modal';
import Button from '@/components/ui/premium/Button';
import Select from '@/components/ui/premium/Select';
import CreatableSelect from '@/components/ui/premium/CreatableSelect';

interface CatalogItemQuickAddModalProps {
  open: boolean;
  onClose: () => void;
  onSuccess?: (product: { id: string; name: string; sellingPrice: number; type: string }) => void;
  categories: { id: string; name: string }[];
  activeBranchId: string;
  defaultType?: ProductType;
  defaultName?: string;
}

export default function CatalogItemQuickAddModal({
  open,
  onClose,
  onSuccess,
  categories,
  activeBranchId,
  defaultType = 'medicine',
  defaultName = '',
}: CatalogItemQuickAddModalProps) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);

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
      branchId: activeBranchId,
      type: defaultType,
      name: defaultName,
      unit: 'pcs',
      stockQuantity: 0,
      reorderLevel: 5,
      purchasePrice: 0,
      sellingPrice: 0,
    },
  });

  const typeWatch = watch('type');
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

  const handleClose = () => {
    reset({
      branchId: activeBranchId,
      type: defaultType,
      name: defaultName,
      unit: 'pcs',
      stockQuantity: 0,
      reorderLevel: 5,
      purchasePrice: 0,
      sellingPrice: 0,
    });
    setError(null);
    onClose();
  };

  const onSubmit = async (data: ProductInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createProductAction(data);
      if (res.success && res.product) {
        onSuccess?.({
          id: res.product.id,
          name: res.product.name,
          sellingPrice: Number(res.product.selling_price),
          type: res.product.type,
        });
        handleClose();
        router.refresh();
      } else {
        setError(res.error || 'Failed to add catalog item');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <Modal
      open={open}
      onClose={handleClose}
      title="Add Catalog Item"
      description="Quick-add to catalog without leaving this screen."
      size="md"
    >
      {error && (
        <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}
      <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
        <input type="hidden" {...register('branchId')} value={activeBranchId} />
        <div>
          <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
            Item name
          </label>
          <input
            type="text"
            {...register('name')}
            className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl outline-none text-xs text-on-surface font-semibold"
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
            options={PRODUCT_TYPE_OPTIONS}
          />
          <div>
            <label className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider mb-1.5">
              Selling price
            </label>
            <input
              type="number"
              step="0.01"
              {...register('sellingPrice', { valueAsNumber: true })}
              className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary rounded-xl outline-none text-xs text-on-surface font-bold"
            />
          </div>
        </div>
        <CreatableSelect
          label="Category (optional)"
          value={categoryNameWatch || ''}
          onChange={(v) => setValue('categoryName', v)}
          options={categoryOptions}
          onCreateOption={handleCreateCategory}
          placeholder="Select or create category…"
        />
        <div className="flex gap-3 pt-2">
          <Button type="button" variant="secondary" className="w-1/2" onClick={handleClose}>
            Cancel
          </Button>
          <Button type="submit" className="w-1/2" loading={isLoading}>
            Add item
          </Button>
        </div>
      </form>
    </Modal>
  );
}
