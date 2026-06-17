'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import {
  createCustomerAction,
  deleteCustomerAction,
  updateCustomerAction,
} from '@/lib/services/customer-actions';
import { CustomerSchema, type CustomerInput } from '@/lib/validations/schemas';
import Select from '@/components/ui/premium/Select';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

interface CustomerFormProps {
  branches: { id: string; name: string }[];
  activeBranchId?: string;
  defaultPhone?: string;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  customerId?: string;
  initialValues?: CustomerInput;
  trigger?: 'add' | 'edit' | 'none';
}

export default function CustomerForm({
  branches,
  activeBranchId,
  defaultPhone,
  onSuccess,
  mode = 'create',
  customerId,
  initialValues,
  trigger = 'add',
}: CustomerFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [existingCustomerId, setExistingCustomerId] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = mode === 'edit';
  const resolvedBranchId = activeBranchId || (branches.length > 0 ? branches[0].id : '');

  const {
    register,
    handleSubmit,
    reset,
    watch,
    setValue,
    formState: { errors },
  } = useForm<CustomerInput>({
    resolver: zodResolver(CustomerSchema),
    defaultValues: initialValues || {
      branchId: resolvedBranchId,
      phone: defaultPhone || '',
      firstName: '',
      lastName: '',
      email: '',
      address: '',
    },
  });

  useEffect(() => {
    if (initialValues) {
      reset(initialValues);
    }
  }, [initialValues, reset]);

  const openForm = () => {
    setExistingCustomerId(null);
    setError(null);
    if (initialValues) {
      reset(initialValues);
    } else {
      reset({
        branchId: resolvedBranchId,
        phone: defaultPhone || '',
        firstName: '',
        lastName: '',
        email: '',
        address: '',
      });
    }
    setIsOpen(true);
  };

  const onSubmit = async (data: CustomerInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res =
        isEdit && customerId
          ? await updateCustomerAction(customerId, data)
          : await createCustomerAction(data);
      if (res.success) {
        reset();
        setExistingCustomerId(null);
        setIsOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        const dupId = (res as { existingCustomerId?: string }).existingCustomerId;
        if (dupId) {
          setExistingCustomerId(dupId);
        } else {
          setExistingCustomerId(null);
        }
        setError(res.error || `Failed to ${isEdit ? 'update' : 'create'} customer`);
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An unexpected error occurred');
    } finally {
      setIsLoading(false);
    }
  };

  return (
    <>
      {trigger === 'add' && (
        <button
          onClick={openForm}
          className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
        >
          <Plus className="w-4 h-4" />
          Add Customer
        </button>
      )}
      {trigger === 'edit' && (
        <button
          type="button"
          onClick={openForm}
          className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary/5"
        >
          <Pencil className="w-3 h-3" />
          Edit
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-on-surface mb-1">
              {isEdit ? 'Edit Customer Profile' : 'Create Customer Profile'}
            </h3>
            <p className="text-xs text-on-surface-variant/60 mb-6">
              {isEdit ? 'Update pet owner details.' : 'Register a new pet owner in the database.'}
            </p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl space-y-2">
                <p>{error}</p>
                {existingCustomerId && (
                  <a
                    href={`/dashboard/customers/${existingCustomerId}`}
                    className="inline-block text-[10px] font-bold text-primary hover:underline"
                  >
                    Use existing customer profile →
                  </a>
                )}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    First Name
                  </label>
                  <input type="text" {...register('firstName')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface" />
                  {errors.firstName && <span className="text-[10px] text-destructive mt-1 block">{errors.firstName.message}</span>}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Last Name
                  </label>
                  <input type="text" {...register('lastName')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface" />
                  {errors.lastName && <span className="text-[10px] text-destructive mt-1 block">{errors.lastName.message}</span>}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Email Address
                </label>
                <input type="email" {...register('email')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface" />
                {errors.email && <span className="text-[10px] text-destructive mt-1 block">{errors.email.message}</span>}
              </div>

              {activeBranchId && <input type="hidden" {...register('branchId')} value={activeBranchId} />}

              <div className={activeBranchId ? '' : 'grid grid-cols-2 gap-4'}>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Phone Number
                  </label>
                  <input type="text" {...register('phone')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface" />
                  {errors.phone && <span className="text-[10px] text-destructive mt-1 block">{errors.phone.message}</span>}
                </div>
                {!activeBranchId && (
                  <div>
                    <Select
                      label="Branch"
                      value={watch('branchId') || ''}
                      onChange={(v) => setValue('branchId', v, { shouldValidate: true })}
                      options={branches.map((b) => ({ value: b.id, label: b.name }))}
                      onAddNew={() => router.push('/dashboard/branches')}
                      addNewLabel="Add branch"
                    />
                  </div>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Home Address
                </label>
                <input type="text" {...register('address')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl outline-none text-xs text-on-surface" />
              </div>

              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="w-1/2 border border-outline-variant py-2.5 rounded-xl text-xs font-semibold text-on-surface">
                  Cancel
                </button>
                <button type="submit" disabled={isLoading} className="w-1/2 bg-primary text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isEdit ? 'Save Changes' : 'Create Profile'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function CustomerDeleteButton({
  customerId,
  customerName,
}: {
  customerId: string;
  customerName: string;
}) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Delete customer "${customerName}"? Linked pets will also be removed.`)) return;
    setIsLoading(true);
    setError(null);
    const res = await deleteCustomerAction(customerId);
    setIsLoading(false);
    if (res.success) {
      router.push('/dashboard/customers');
      router.refresh();
    } else {
      setError(res.error || 'Delete failed');
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={handleDelete} disabled={isLoading} className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive border border-destructive/30 px-2 py-1 rounded-lg hover:bg-destructive/5 disabled:opacity-60">
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Delete
      </button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}
