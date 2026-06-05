'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { searchCustomersAction } from '@/lib/services/customer-actions';
import { createStaffAppointmentAction } from '@/lib/services/appointment-actions';
import {
  X,
  Search,
  Loader2,
  Calendar,
  AlertTriangle,
  User,
  Heart,
} from 'lucide-react';

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
}

type SearchCustomer = {
  id: string;
  firstName: string;
  lastName: string;
  phone: string;
  pets: { id: string; name: string; species: string }[];
};

export default function StaffAppointmentForm({
  doctors,
  activeBranchId,
  defaultOpen = false,
  onClose,
}: StaffAppointmentFormProps) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(defaultOpen);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<SearchCustomer[]>([]);
  const [isSearching, setIsSearching] = useState(false);
  const [selectedCustomer, setSelectedCustomer] = useState<SearchCustomer | null>(null);
  const [selectedPetId, setSelectedPetId] = useState('');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [reason, setReason] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);
  const [intakeNotes, setIntakeNotes] = useState('');
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleClose = () => {
    setIsOpen(false);
    onClose?.();
  };

  const handleSearch = async (val: string) => {
    setSearchQuery(val);
    if (val.trim().length < 2) {
      setSearchResults([]);
      return;
    }
    setIsSearching(true);
    try {
      const res = await searchCustomersAction(val);
      if (res.success && res.customers) {
        setSearchResults(res.customers as SearchCustomer[]);
      }
    } finally {
      setIsSearching(false);
    }
  };

  const handleSelectCustomer = (customer: SearchCustomer, petId: string) => {
    setSelectedCustomer(customer);
    setSelectedPetId(petId);
    setSearchResults([]);
    setSearchQuery('');
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!selectedCustomer || !selectedPetId || !preferredDate || !preferredTime || !reason.trim()) {
      setError('Complete all required fields and select a patient.');
      return;
    }
    setIsSubmitting(true);
    setError(null);
    try {
      const res = await createStaffAppointmentAction({
        customerId: selectedCustomer.id,
        petId: selectedPetId,
        branchId: activeBranchId,
        doctorId: doctorId || undefined,
        preferredDate,
        preferredTime,
        reason: reason.trim(),
        isEmergency,
        intakeNotes: intakeNotes.trim() || undefined,
      });
      if (res.success) {
        handleClose();
        setSelectedCustomer(null);
        setSelectedPetId('');
        setReason('');
        setIntakeNotes('');
        setIsEmergency(false);
        router.refresh();
      } else {
        setError(res.error || 'Failed to create appointment');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) {
    return (
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="inline-flex items-center gap-2 bg-primary text-on-primary px-4 py-2.5 rounded-xl text-xs font-semibold hover:opacity-90"
      >
        <Calendar className="w-4 h-4" />
        New appointment
      </button>
    );
  }

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-16 px-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg max-h-[85vh] overflow-y-auto rounded-2xl border border-outline-variant shadow-premium">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant">
          <div>
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              New appointment
            </h2>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Link an existing customer and pet, assign doctor and slot.
            </p>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-lg hover:bg-surface-container-high">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-4">
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              {error}
            </div>
          )}

          {!selectedCustomer ? (
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-2">
                Find customer & pet
              </label>
              <div className="relative">
                <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
                <input
                  type="search"
                  placeholder="Search by name or phone..."
                  value={searchQuery}
                  onChange={(e) => handleSearch(e.target.value)}
                  className="w-full pl-9 pr-3 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs"
                />
                {isSearching && (
                  <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
                )}
              </div>
              {searchResults.length > 0 && (
                <ul className="mt-2 border border-outline-variant rounded-xl divide-y divide-outline-variant/50 max-h-40 overflow-y-auto">
                  {searchResults.map((c) =>
                    (c.pets?.length ? c.pets : []).map((pet) => (
                      <li key={`${c.id}-${pet.id}`}>
                        <button
                          type="button"
                          onClick={() => handleSelectCustomer(c, pet.id)}
                          className="w-full text-left px-3 py-2 hover:bg-surface-container-high text-xs"
                        >
                          <span className="font-semibold text-on-surface block">
                            {pet.name} ({pet.species})
                          </span>
                          <span className="text-on-surface-variant">
                            {c.firstName} {c.lastName} · {c.phone}
                          </span>
                        </button>
                      </li>
                    ))
                  )}
                </ul>
              )}
              <p className="text-[10px] text-on-surface-variant mt-2">
                No patient on file?{' '}
                <Link href="/dashboard/customers" className="text-primary font-semibold hover:underline">
                  Register customer & pet
                </Link>
              </p>
            </div>
          ) : (
            <div className="flex items-center justify-between p-3 bg-surface-container/50 rounded-xl border border-outline-variant/50">
              <div className="flex items-center gap-3">
                <Heart className="w-4 h-4 text-primary" />
                <div>
                  <span className="text-xs font-bold text-on-surface block">
                    {selectedCustomer.pets.find((p) => p.id === selectedPetId)?.name}
                  </span>
                  <span className="text-[10px] text-on-surface-variant">
                    {selectedCustomer.firstName} {selectedCustomer.lastName}
                  </span>
                </div>
              </div>
              <button
                type="button"
                onClick={() => {
                  setSelectedCustomer(null);
                  setSelectedPetId('');
                }}
                className="text-[10px] text-primary font-bold"
              >
                Change
              </button>
            </div>
          )}

          <div className="grid grid-cols-2 gap-3">
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
                Date
              </label>
              <input
                type="date"
                required
                value={preferredDate}
                onChange={(e) => setPreferredDate(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
              />
            </div>
            <div>
              <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
                Time
              </label>
              <input
                type="time"
                required
                value={preferredTime}
                onChange={(e) => setPreferredTime(e.target.value)}
                className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
              />
            </div>
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
              Assign doctor (optional until check-in)
            </label>
            <select
              value={doctorId}
              onChange={(e) => setDoctorId(e.target.value)}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
            >
              <option value="">— Select later —</option>
              {doctors.map((d) => (
                <option key={d.id} value={d.id}>
                  Dr. {d.firstName} {d.lastName}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
              Reason for visit
            </label>
            <input
              type="text"
              required
              value={reason}
              onChange={(e) => setReason(e.target.value)}
              placeholder="e.g. Annual check-up, limping"
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
            />
          </div>

          <div>
            <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
              Initial history / intake (optional)
            </label>
            <textarea
              value={intakeNotes}
              onChange={(e) => setIntakeNotes(e.target.value)}
              rows={3}
              placeholder="Presenting complaint, symptoms, duration..."
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs resize-none"
            />
          </div>

          <label className="flex items-center gap-2 cursor-pointer">
            <input
              type="checkbox"
              checked={isEmergency}
              onChange={(e) => setIsEmergency(e.target.checked)}
              className="rounded border-outline-variant"
            />
            <AlertTriangle className="w-4 h-4 text-destructive" />
            <span className="text-xs font-bold text-destructive">Mark as emergency</span>
          </label>

          <div className="flex gap-2 pt-2">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold disabled:opacity-60 flex items-center justify-center gap-2"
            >
              {isSubmitting ? <Loader2 className="w-4 h-4 animate-spin" /> : <User className="w-4 h-4" />}
              Create appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
