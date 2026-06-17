'use client';

import { useEffect, useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createPetAction, deletePetAction, updatePetAction } from '@/lib/services/pet-actions';
import { PetSchema, type PetInput } from '@/lib/validations/schemas';
import CreatableSelect from '@/components/ui/premium/CreatableSelect';
import { SPECIES_OPTIONS } from '@/lib/pets/species-options';
import { useCreatableOptions } from '@/lib/hooks/useCreatableOptions';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

interface PetFormProps {
  customerId: string;
  onSuccess?: () => void;
  mode?: 'create' | 'edit';
  petId?: string;
  initialValues?: PetInput;
  trigger?: 'add' | 'edit' | 'none';
}

export default function PetForm({
  customerId,
  onSuccess,
  mode = 'create',
  petId,
  initialValues,
  trigger = 'add',
}: PetFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();
  const isEdit = mode === 'edit';

  const { register, handleSubmit, reset, setValue, watch, formState: { errors } } = useForm<PetInput>({
    resolver: zodResolver(PetSchema),
    defaultValues: initialValues || { customerId, weightKg: 0, name: '', species: '', gender: 'Male' },
  });

  const speciesWatch = watch('species');
  const { options: speciesOptions, handleCreate: handleCreateSpecies } = useCreatableOptions(
    SPECIES_OPTIONS,
    undefined,
    { refreshOnCreate: false }
  );

  useEffect(() => {
    if (initialValues) reset(initialValues);
  }, [initialValues, reset]);

  const openForm = () => {
    setError(null);
    reset(initialValues || { customerId, weightKg: 0, name: '', species: '', gender: 'Male' });
    setIsOpen(true);
  };

  const onSubmit = async (data: PetInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = isEdit && petId ? await updatePetAction(petId, data) : await createPetAction(data);
      if (res.success) {
        reset();
        setIsOpen(false);
        router.refresh();
        onSuccess?.();
      } else {
        setError(res.error || `Failed to ${isEdit ? 'update' : 'create'} pet record`);
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
        <button onClick={openForm} className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2">
          <Plus className="w-4 h-4" /> Register Pet
        </button>
      )}
      {trigger === 'edit' && (
        <button type="button" onClick={openForm} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary/5">
          <Pencil className="w-3 h-3" /> Edit
        </button>
      )}

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative overflow-y-auto max-h-[90vh]">
            <button onClick={() => setIsOpen(false)} className="absolute right-4 top-4 text-on-surface-variant/40"><X className="w-5 h-5" /></button>
            <h3 className="text-base font-bold text-on-surface mb-1">{isEdit ? 'Edit Pet Profile' : 'Register Pet Profile'}</h3>
            {error && <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">{error}</div>}
            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <input type="hidden" {...register('customerId')} value={customerId} />
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase mb-1.5">Pet Name</label>
                  <input type="text" {...register('name')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
                  {errors.name && <span className="text-[10px] text-destructive">{errors.name.message}</span>}
                </div>
                <div>
                  <CreatableSelect
                    label="Species"
                    value={speciesWatch || ''}
                    onChange={(v) => setValue('species', v, { shouldValidate: true })}
                    options={speciesOptions}
                    onCreateOption={handleCreateSpecies}
                    placeholder="Select or add species…"
                  />
                  {errors.species && <span className="text-[10px] text-destructive">{errors.species.message}</span>}
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase mb-1.5">Breed</label>
                  <input type="text" {...register('breed')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase mb-1.5">Gender</label>
                  <select {...register('gender')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs font-semibold">
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Neutered Male">Neutered Male</option>
                    <option value="Spayed Female">Spayed Female</option>
                  </select>
                </div>
              </div>
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold uppercase mb-1.5">Date of Birth</label>
                  <input type="date" {...register('dateOfBirth')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
                </div>
                <div>
                  <label className="block text-[10px] font-semibold uppercase mb-1.5">Weight (kg)</label>
                  <input type="number" step="0.01" {...register('weightKg', { valueAsNumber: true })} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
                </div>
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase mb-1.5">Allergies</label>
                <input type="text" {...register('allergies')} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
              </div>
              <div>
                <label className="block text-[10px] font-semibold uppercase mb-1.5">Medical Notes</label>
                <textarea {...register('medicalNotes')} rows={3} className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs" />
              </div>
              <div className="flex gap-3 pt-2">
                <button type="button" onClick={() => setIsOpen(false)} className="w-1/2 border border-outline-variant py-2.5 rounded-xl text-xs font-semibold">Cancel</button>
                <button type="submit" disabled={isLoading} className="w-1/2 bg-primary text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                  {isLoading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : isEdit ? 'Save Changes' : 'Register Pet'}
                </button>
              </div>
            </form>
          </div>
        </div>
      )}
    </>
  );
}

export function PetDeleteButton({ petId, petName }: { petId: string; petName: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm(`Delete pet "${petName}"?`)) return;
    setIsLoading(true);
    const res = await deletePetAction(petId);
    setIsLoading(false);
    if (res.success) router.refresh();
    else setError(res.error || 'Delete failed');
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button type="button" onClick={handleDelete} disabled={isLoading} className="inline-flex items-center gap-1 text-[10px] font-bold text-destructive border border-destructive/30 px-2 py-1 rounded-lg disabled:opacity-60">
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />} Delete
      </button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}
