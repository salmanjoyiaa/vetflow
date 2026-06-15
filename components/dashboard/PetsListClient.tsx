'use client';

import Link from 'next/link';
import PetForm, { PetDeleteButton } from '@/components/forms/PetForm';
import type { PetInput } from '@/lib/validations/schemas';
import { User, Calendar, Weight, ChevronRight } from 'lucide-react';

export type PetListRow = {
  id: string;
  name: string;
  species: string;
  breed: string | null;
  gender: string;
  date_of_birth: string | null;
  weight_kg: number | null;
  customer_id: string;
  allergies: string | null;
  medical_notes: string | null;
  ownerFirstName: string | null;
  ownerLastName: string | null;
};

interface PetsListClientProps {
  pets: PetListRow[];
  isAdmin: boolean;
}

export default function PetsListClient({ pets, isAdmin }: PetsListClientProps) {
  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
            <th className="px-6 py-4">Pet Name</th>
            <th className="px-6 py-4">Owner Name</th>
            <th className="px-6 py-4">Species & Breed</th>
            <th className="px-6 py-4">Gender</th>
            <th className="px-6 py-4">Metrics</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30 text-xs">
          {pets.map((pet) => {
            const petInput: PetInput = {
              customerId: pet.customer_id,
              name: pet.name,
              species: pet.species,
              breed: pet.breed || '',
              gender: pet.gender,
              dateOfBirth: pet.date_of_birth || '',
              weightKg: pet.weight_kg ?? 0,
              allergies: pet.allergies || '',
              medicalNotes: pet.medical_notes || '',
            };

            return (
              <tr key={pet.id} className="hover:bg-surface-container/10 transition-colors">
                <td className="px-6 py-4 font-bold text-on-surface">{pet.name}</td>
                <td className="px-6 py-4 text-on-surface-variant/80">
                  {pet.ownerFirstName ? (
                    <Link href={`/dashboard/customers/${pet.customer_id}`} className="flex items-center gap-1 hover:text-primary hover:underline">
                      <User className="w-3.5 h-3.5 text-primary/65" />
                      <span>{pet.ownerFirstName} {pet.ownerLastName}</span>
                    </Link>
                  ) : '—'}
                </td>
                <td className="px-6 py-4 text-on-surface-variant/80 capitalize">
                  <span className="font-bold text-on-surface">{pet.species}</span>
                  {pet.breed && <span className="text-on-surface-variant/60"> • {pet.breed}</span>}
                </td>
                <td className="px-6 py-4 text-on-surface-variant/70">{pet.gender}</td>
                <td className="px-6 py-4 space-y-1 text-[11px] text-on-surface-variant/65">
                  {pet.date_of_birth && (
                    <div className="flex items-center gap-1">
                      <Calendar className="w-3 h-3" />
                      <span>DOB: {pet.date_of_birth}</span>
                    </div>
                  )}
                  {pet.weight_kg && (
                    <div className="flex items-center gap-1">
                      <Weight className="w-3 h-3" />
                      <span>Weight: {pet.weight_kg} kg</span>
                    </div>
                  )}
                </td>
                <td className="px-6 py-4 text-right">
                  <div className="flex flex-wrap justify-end items-center gap-2">
                    <Link href={`/dashboard/pets/${pet.id}`} className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline">
                      Medical File <ChevronRight className="w-3 h-3" />
                    </Link>
                    {isAdmin && (
                      <>
                        <PetForm mode="edit" petId={pet.id} customerId={pet.customer_id} initialValues={petInput} trigger="edit" />
                        <PetDeleteButton petId={pet.id} petName={pet.name} />
                      </>
                    )}
                  </div>
                </td>
              </tr>
            );
          })}
        </tbody>
      </table>
    </div>
  );
}
