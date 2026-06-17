'use client';

import CustomerForm, { CustomerDeleteButton } from '@/components/forms/CustomerForm';
import PetForm, { PetDeleteButton } from '@/components/forms/PetForm';
import type { CustomerInput } from '@/lib/validations/schemas';
import type { PetInput } from '@/lib/validations/schemas';

interface CustomerDetailAdminBarProps {
  isAdmin: boolean;
  branches: { id: string; name: string }[];
  customer: {
    id: string;
    branch_id: string;
    first_name: string;
    last_name: string;
    email: string | null;
    phone: string;
    address: string | null;
  };
}

export default function CustomerDetailAdminBar({
  isAdmin,
  branches,
  customer,
}: CustomerDetailAdminBarProps) {
  if (!isAdmin) return null;

  const customerInput: CustomerInput = {
    branchId: customer.branch_id,
    firstName: customer.first_name,
    lastName: customer.last_name,
    email: customer.email || '',
    phone: customer.phone,
    address: customer.address || '',
  };

  return (
    <div className="flex items-center gap-2">
      <CustomerForm
        mode="edit"
        customerId={customer.id}
        initialValues={customerInput}
        branches={branches}
        activeBranchId={customer.branch_id}
        trigger="edit"
      />
      <CustomerDeleteButton
        customerId={customer.id}
        customerName={`${customer.first_name} ${customer.last_name}`}
      />
    </div>
  );
}

export function PetRowAdminActions({
  isAdmin,
  pet,
}: {
  isAdmin: boolean;
  pet: {
    id: string;
    customer_id: string;
    name: string;
    species: string;
    breed: string | null;
    gender: string;
    date_of_birth: string | null;
    weight_kg: number | null;
    allergies: string | null;
    medical_notes: string | null;
  };
}) {
  if (!isAdmin) return null;

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
    <div className="flex items-center gap-2">
      <PetForm mode="edit" petId={pet.id} customerId={pet.customer_id} initialValues={petInput} trigger="edit" />
      <PetDeleteButton petId={pet.id} petName={pet.name} />
    </div>
  );
}
