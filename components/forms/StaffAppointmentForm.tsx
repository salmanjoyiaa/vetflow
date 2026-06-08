'use client';

import { useState, useEffect } from 'react';
import NewAppointmentWizard from '@/components/reception/NewAppointmentWizard';
import { Calendar } from 'lucide-react';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface StaffAppointmentFormProps {
  doctors: Doctor[];
  activeBranchId: string;
  defaultOpen?: boolean;
  onClose?: () => void;
  initialPhone?: string;
  initialCustomerId?: string;
  initialPetId?: string;
}

export default function StaffAppointmentForm({
  doctors,
  activeBranchId,
  defaultOpen = false,
  onClose,
  initialPhone,
  initialCustomerId,
  initialPetId,
}: StaffAppointmentFormProps) {
  const [isOpen, setIsOpen] = useState(defaultOpen);

  useEffect(() => {
    if (defaultOpen) setIsOpen(true);
  }, [defaultOpen]);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90"
      >
        <Calendar className="w-4 h-4" />
        New appointment
      </button>

      <NewAppointmentWizard
        doctors={doctors}
        activeBranchId={activeBranchId}
        isOpen={isOpen}
        onClose={handleClose}
        initialPhone={initialPhone}
        initialCustomerId={initialCustomerId}
        initialPetId={initialPetId}
      />
    </>
  );
}
