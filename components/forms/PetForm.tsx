'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { useRouter } from 'next/navigation';
import { createPetAction } from '@/lib/services/pet-actions';
import { PetSchema, type PetInput } from '@/lib/validations/schemas';
import { Loader2, Plus, X } from 'lucide-react';

interface PetFormProps {
  customerId: string;
  onSuccess?: () => void;
}

export default function PetForm({ customerId, onSuccess }: PetFormProps) {
  const [isOpen, setIsOpen] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [isLoading, setIsLoading] = useState(false);
  const router = useRouter();

  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<PetInput>({
    resolver: zodResolver(PetSchema),
    defaultValues: {
      customerId,
      weightKg: 0,
    },
  });

  const onSubmit = async (data: PetInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createPetAction(data);
      if (res.success) {
        reset();
        setIsOpen(false);
        router.refresh();
        if (onSuccess) onSuccess();
      } else {
        setError(res.error || 'Failed to create pet record');
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
        className="bg-primary hover:bg-primary/95 text-white px-4 py-2.5 rounded-xl text-xs font-semibold shadow-sm flex items-center gap-2 transition-all"
      >
        <Plus className="w-4 h-4" />
        Register Pet
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-md rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative overflow-y-auto max-h-[90vh]">
            <button
              onClick={() => setIsOpen(false)}
              className="absolute right-4 top-4 text-on-surface-variant/40 hover:text-on-surface-variant transition-colors"
            >
              <X className="w-5 h-5" />
            </button>

            <h3 className="text-base font-bold text-on-surface mb-1">Register Pet Profile</h3>
            <p className="text-xs text-on-surface-variant/60 mb-6">Create a biological profile for the patient.</p>

            {error && (
              <div className="mb-4 p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                {error}
              </div>
            )}

            <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Pet Name
                  </label>
                  <input
                    type="text"
                    {...register('name')}
                    placeholder="e.g. Max"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.name && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.name.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Species
                  </label>
                  <input
                    type="text"
                    {...register('species')}
                    placeholder="e.g. Dog, Cat, Bird"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.species && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.species.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Breed
                  </label>
                  <input
                    type="text"
                    {...register('breed')}
                    placeholder="e.g. Golden Retriever"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.breed && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.breed.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Gender
                  </label>
                  <select
                    {...register('gender')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface font-semibold"
                  >
                    <option value="Male">Male</option>
                    <option value="Female">Female</option>
                    <option value="Neutered Male">Neutered Male</option>
                    <option value="Spayed Female">Spayed Female</option>
                  </select>
                  {errors.gender && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.gender.message}</span>
                  )}
                </div>
              </div>

              <div className="grid grid-cols-2 gap-4">
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Date of Birth
                  </label>
                  <input
                    type="date"
                    {...register('dateOfBirth')}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.dateOfBirth && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.dateOfBirth.message}</span>
                  )}
                </div>
                <div>
                  <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                    Weight (kg)
                  </label>
                  <input
                    type="number"
                    step="0.01"
                    {...register('weightKg', { valueAsNumber: true })}
                    placeholder="e.g. 12.5"
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                  />
                  {errors.weightKg && (
                    <span className="text-[10px] text-destructive mt-1 block">{errors.weightKg.message}</span>
                  )}
                </div>
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  Allergies / Critical Warnings
                </label>
                <input
                  type="text"
                  {...register('allergies')}
                  placeholder="e.g. Penicillin, specific foods"
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                />
                {errors.allergies && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.allergies.message}</span>
                )}
              </div>

              <div>
                <label className="block text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider mb-1.5">
                  General Medical Notes
                </label>
                <textarea
                  {...register('medicalNotes')}
                  placeholder="Enter any general notes about history or temperament..."
                  rows={3}
                  className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant focus:border-primary focus:ring-1 focus:ring-primary rounded-xl outline-none text-xs text-on-surface"
                />
                {errors.medicalNotes && (
                  <span className="text-[10px] text-destructive mt-1 block">{errors.medicalNotes.message}</span>
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
                      Saving...
                    </>
                  ) : (
                    'Register Pet'
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

