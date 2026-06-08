'use client';

import { useState, useEffect, useCallback, useRef } from 'react';
import { useRouter } from 'next/navigation';
import {
  lookupCustomerByPhoneAction,
  getCustomerByIdAction,
  type CustomerSearchResult,
} from '@/lib/services/customer-actions';
import { createAppointmentWithPatientAction } from '@/lib/services/appointment-actions';
import { normalizePhoneInput, looksLikePhone } from '@/lib/reception/phone';
import {
  X,
  Loader2,
  Calendar,
  AlertTriangle,
  Phone,
  User,
  Heart,
  CheckCircle2,
  Plus,
} from 'lucide-react';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

export interface NewAppointmentWizardProps {
  doctors: Doctor[];
  activeBranchId: string;
  isOpen: boolean;
  onClose: () => void;
  initialPhone?: string;
  initialCustomerId?: string;
  initialPetId?: string;
}

export default function NewAppointmentWizard({
  doctors,
  activeBranchId,
  isOpen,
  onClose,
  initialPhone = '',
  initialCustomerId,
  initialPetId,
}: NewAppointmentWizardProps) {
  const router = useRouter();
  const lookupTimer = useRef<ReturnType<typeof setTimeout> | null>(null);

  const [phone, setPhone] = useState(initialPhone);
  const [firstName, setFirstName] = useState('');
  const [lastName, setLastName] = useState('');
  const [email, setEmail] = useState('');
  const [address, setAddress] = useState('');
  const [existingCustomer, setExistingCustomer] = useState<CustomerSearchResult | null>(null);
  const [isLookingUp, setIsLookingUp] = useState(false);

  const [selectedPetId, setSelectedPetId] = useState<string | null>(initialPetId || null);
  const [isNewPet, setIsNewPet] = useState(false);
  const [petName, setPetName] = useState('');
  const [petSpecies, setPetSpecies] = useState('Dog');
  const [petBreed, setPetBreed] = useState('');

  const [preferredDate, setPreferredDate] = useState('');
  const [preferredTime, setPreferredTime] = useState('');
  const [doctorId, setDoctorId] = useState(doctors[0]?.id || '');
  const [reason, setReason] = useState('');
  const [intakeNotes, setIntakeNotes] = useState('');
  const [isEmergency, setIsEmergency] = useState(false);

  const [error, setError] = useState<string | null>(null);
  const [isSubmitting, setIsSubmitting] = useState(false);
  const [prefillDone, setPrefillDone] = useState(false);

  const phoneValid = normalizePhoneInput(phone).replace(/^\+/, '').length >= 7;
  const petReady =
    selectedPetId != null ||
    (isNewPet && petName.trim().length > 0 && petSpecies.trim().length > 0);
  const ownerReady = phoneValid && firstName.trim() && lastName.trim();
  const visitReady = preferredDate && preferredTime && reason.trim();

  const runPhoneLookup = useCallback(async (phoneValue: string) => {
    if (!looksLikePhone(phoneValue)) {
      setExistingCustomer(null);
      return;
    }
    setIsLookingUp(true);
    setError(null);
    try {
      const res = await lookupCustomerByPhoneAction(phoneValue);
      if (res.success && res.customer) {
        setExistingCustomer(res.customer);
        setFirstName(res.customer.firstName);
        setLastName(res.customer.lastName);
        setEmail(res.customer.email || '');
        setAddress(res.customer.address || '');
        if (res.customer.pets.length === 1 && !selectedPetId) {
          setSelectedPetId(res.customer.pets[0].id);
          setIsNewPet(false);
        }
      } else if (res.success) {
        setExistingCustomer(null);
      } else {
        setError(res.error || 'Phone lookup failed');
      }
    } finally {
      setIsLookingUp(false);
    }
  }, [selectedPetId]);

  useEffect(() => {
    if (!isOpen || prefillDone) return;

    const loadPrefill = async () => {
      if (initialCustomerId) {
        const res = await getCustomerByIdAction(initialCustomerId);
        if (res.success && res.customer) {
          setExistingCustomer(res.customer);
          setPhone(res.customer.phone);
          setFirstName(res.customer.firstName);
          setLastName(res.customer.lastName);
          setEmail(res.customer.email || '');
          setAddress(res.customer.address || '');
          if (initialPetId) {
            setSelectedPetId(initialPetId);
            setIsNewPet(false);
          }
        }
      } else if (initialPhone) {
        setPhone(initialPhone);
        await runPhoneLookup(initialPhone);
      }
      setPrefillDone(true);
    };

    loadPrefill();
  }, [isOpen, initialCustomerId, initialPetId, initialPhone, prefillDone, runPhoneLookup]);

  useEffect(() => {
    if (!isOpen) {
      setPrefillDone(false);
    }
  }, [isOpen]);

  const handlePhoneChange = (val: string) => {
    setPhone(val);
    if (lookupTimer.current) clearTimeout(lookupTimer.current);
    lookupTimer.current = setTimeout(() => {
      if (looksLikePhone(val)) {
        runPhoneLookup(val);
      } else {
        setExistingCustomer(null);
      }
    }, 400);
  };

  const handlePhoneBlur = () => {
    if (looksLikePhone(phone)) {
      runPhoneLookup(phone);
    }
  };

  const resetForm = () => {
    setPhone('');
    setFirstName('');
    setLastName('');
    setEmail('');
    setAddress('');
    setExistingCustomer(null);
    setSelectedPetId(null);
    setIsNewPet(false);
    setPetName('');
    setPetSpecies('Dog');
    setPetBreed('');
    setPreferredDate('');
    setPreferredTime('');
    setReason('');
    setIntakeNotes('');
    setIsEmergency(false);
    setError(null);
    setPrefillDone(false);
  };

  const handleClose = () => {
    resetForm();
    onClose();
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    if (!ownerReady || !petReady || !visitReady) {
      setError('Complete owner, pet, and visit details.');
      return;
    }

    setIsSubmitting(true);
    setError(null);

    try {
      const res = await createAppointmentWithPatientAction({
        branchId: activeBranchId,
        customerId: existingCustomer?.id,
        customer: existingCustomer
          ? undefined
          : {
              firstName: firstName.trim(),
              lastName: lastName.trim(),
              phone: phone.trim(),
              email: email.trim() || '',
              address: address.trim() || '',
            },
        petId: selectedPetId && !isNewPet ? selectedPetId : undefined,
        pet:
          selectedPetId && !isNewPet
            ? undefined
            : {
                name: petName.trim(),
                species: petSpecies,
                breed: petBreed.trim() || '',
                gender: 'Male',
              },
        doctorId: doctorId || '',
        preferredDate,
        preferredTime,
        reason: reason.trim(),
        isEmergency,
        intakeNotes: intakeNotes.trim() || '',
      });

      if (res.success) {
        handleClose();
        router.refresh();
      } else {
        setError('error' in res && res.error ? res.error : 'Failed to create appointment');
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'An error occurred');
    } finally {
      setIsSubmitting(false);
    }
  };

  if (!isOpen) return null;

  const pets = existingCustomer?.pets || [];

  return (
    <div className="fixed inset-0 z-50 flex items-start justify-center pt-12 px-4 bg-black/60 backdrop-blur-sm">
      <div className="glass-panel w-full max-w-lg max-h-[90vh] overflow-y-auto rounded-2xl border border-outline-variant shadow-premium">
        <div className="flex items-center justify-between p-5 border-b border-outline-variant sticky top-0 bg-surface-container/95 backdrop-blur-sm z-10">
          <div>
            <h2 className="text-sm font-bold text-on-surface flex items-center gap-2">
              <Calendar className="w-4 h-4 text-primary" />
              New appointment
            </h2>
            <p className="text-[10px] text-on-surface-variant mt-0.5">
              Enter owner details, select or add a pet, then pick date and doctor.
            </p>
          </div>
          <button type="button" onClick={handleClose} className="p-1.5 rounded-lg hover:bg-surface-container-high">
            <X className="w-5 h-5 text-on-surface-variant" />
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 space-y-6">
          {error && (
            <div className="text-xs text-destructive bg-destructive/10 border border-destructive/20 rounded-xl p-3">
              {error}
            </div>
          )}

          {/* Step 1: Owner */}
          <section className="space-y-3">
            <div className="flex items-center gap-2">
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center">
                1
              </span>
              <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Pet owner</h3>
              {existingCustomer && (
                <span className="ml-auto inline-flex items-center gap-1 text-[10px] font-bold text-emerald-600 bg-emerald-500/10 px-2 py-0.5 rounded-full">
                  <CheckCircle2 className="w-3 h-3" />
                  Existing customer
                </span>
              )}
              {phoneValid && !existingCustomer && !isLookingUp && (
                <span className="ml-auto text-[10px] font-bold text-primary bg-primary/10 px-2 py-0.5 rounded-full">
                  New customer
                </span>
              )}
            </div>

            <div className="relative">
              <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
              <input
                type="tel"
                required
                placeholder="Phone number (start here)"
                value={phone}
                onChange={(e) => handlePhoneChange(e.target.value)}
                onBlur={handlePhoneBlur}
                className="w-full pl-9 pr-9 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs font-semibold"
              />
              {isLookingUp && (
                <Loader2 className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 animate-spin text-primary" />
              )}
            </div>

            <div className="grid grid-cols-2 gap-3">
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
                  First name
                </label>
                <input
                  type="text"
                  required
                  value={firstName}
                  onChange={(e) => setFirstName(e.target.value)}
                  disabled={!!existingCustomer}
                  className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs disabled:opacity-70"
                />
              </div>
              <div>
                <label className="text-[10px] font-bold text-on-surface-variant uppercase block mb-1">
                  Last name
                </label>
                <input
                  type="text"
                  required
                  value={lastName}
                  onChange={(e) => setLastName(e.target.value)}
                  disabled={!!existingCustomer}
                  className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs disabled:opacity-70"
                />
              </div>
            </div>

            <input
              type="email"
              placeholder="Email (optional)"
              value={email}
              onChange={(e) => setEmail(e.target.value)}
              disabled={!!existingCustomer}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs disabled:opacity-70"
            />
            <input
              type="text"
              placeholder="Home address"
              value={address}
              onChange={(e) => setAddress(e.target.value)}
              disabled={!!existingCustomer}
              className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs disabled:opacity-70"
            />
          </section>

          {/* Step 2: Pet */}
          {phoneValid && (
            <section className="space-y-3 border-t border-outline-variant/40 pt-5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center">
                  2
                </span>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Patient (pet)</h3>
              </div>

              {existingCustomer && pets.length > 0 && !isNewPet && (
                <div className="grid grid-cols-2 gap-2">
                  {pets.map((pet) => (
                    <button
                      key={pet.id}
                      type="button"
                      onClick={() => {
                        setSelectedPetId(pet.id);
                        setIsNewPet(false);
                      }}
                      className={`text-left p-3 rounded-xl border text-xs transition-colors ${
                        selectedPetId === pet.id
                          ? 'border-primary bg-primary/10'
                          : 'border-outline-variant hover:border-primary/40'
                      }`}
                    >
                      <span className="font-bold text-on-surface flex items-center gap-1">
                        <Heart className="w-3 h-3 text-primary" />
                        {pet.name}
                      </span>
                      <span className="text-[10px] text-on-surface-variant">
                        {pet.species}
                        {pet.breed ? ` · ${pet.breed}` : ''}
                      </span>
                    </button>
                  ))}
                </div>
              )}

              {(existingCustomer || !existingCustomer) && (
                <button
                  type="button"
                  onClick={() => {
                    setIsNewPet(true);
                    setSelectedPetId(null);
                  }}
                  className={`text-[10px] font-bold flex items-center gap-1 ${
                    isNewPet ? 'text-primary' : 'text-on-surface-variant'
                  }`}
                >
                  <Plus className="w-3 h-3" />
                  {existingCustomer ? 'Add new pet for this owner' : 'Register new pet'}
                </button>
              )}

              {(isNewPet || (!existingCustomer && phoneValid) || (existingCustomer && pets.length === 0)) && (
                <div className="space-y-2 p-3 rounded-xl border border-outline-variant/50 bg-surface-container/30">
                  <input
                    type="text"
                    required={isNewPet || !existingCustomer || pets.length === 0}
                    placeholder="Pet name"
                    value={petName}
                    onChange={(e) => {
                      setPetName(e.target.value);
                      setIsNewPet(true);
                      setSelectedPetId(null);
                    }}
                    className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
                  />
                  <div className="grid grid-cols-2 gap-2">
                    <select
                      value={petSpecies}
                      onChange={(e) => setPetSpecies(e.target.value)}
                      className="px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
                    >
                      <option>Dog</option>
                      <option>Cat</option>
                      <option>Bird</option>
                      <option>Other</option>
                    </select>
                    <input
                      type="text"
                      placeholder="Breed (optional)"
                      value={petBreed}
                      onChange={(e) => setPetBreed(e.target.value)}
                      className="px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
                    />
                  </div>
                </div>
              )}
            </section>
          )}

          {/* Step 3: Visit */}
          {ownerReady && petReady && (
            <section className="space-y-3 border-t border-outline-variant/40 pt-5">
              <div className="flex items-center gap-2">
                <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-black flex items-center justify-center">
                  3
                </span>
                <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Visit details</h3>
              </div>

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
                  Select doctor
                </label>
                <select
                  value={doctorId}
                  onChange={(e) => setDoctorId(e.target.value)}
                  className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs"
                >
                  <option value="">— Assign at check-in —</option>
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

              <textarea
                value={intakeNotes}
                onChange={(e) => setIntakeNotes(e.target.value)}
                rows={2}
                placeholder="Initial history / intake (optional)"
                className="w-full px-3 py-2 bg-surface-container border border-outline-variant rounded-xl text-xs resize-none"
              />

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
            </section>
          )}

          <div className="flex gap-2 pt-2 sticky bottom-0 bg-surface-container/95 pb-1">
            <button
              type="button"
              onClick={handleClose}
              className="flex-1 py-2.5 rounded-xl border border-outline-variant text-xs font-semibold text-on-surface-variant"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={isSubmitting || !ownerReady || !petReady || !visitReady}
              className="flex-1 py-2.5 rounded-xl bg-primary text-on-primary text-xs font-semibold disabled:opacity-50 flex items-center justify-center gap-2"
            >
              {isSubmitting ? (
                <Loader2 className="w-4 h-4 animate-spin" />
              ) : (
                <User className="w-4 h-4" />
              )}
              Create appointment
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
