'use client';

import { useState } from 'react';
import { useForm } from 'react-hook-form';
import { zodResolver } from '@hookform/resolvers/zod';
import { AppointmentRequestSchema, type AppointmentRequestInput, createAppointmentRequestAction } from '@/lib/services/appointment-actions';
import { Loader2, CheckCircle2, ArrowRight } from 'lucide-react';

interface Branch {
  id: string;
  name: string;
  address: string | null;
}

interface PublicBookingFormClientProps {
  orgSlug: string;
  branches: Branch[];
}

export default function PublicBookingFormClient({
  orgSlug,
  branches,
}: PublicBookingFormClientProps) {
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [isLoading, setIsLoading] = useState(false);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<AppointmentRequestInput>({
    resolver: zodResolver(AppointmentRequestSchema),
    defaultValues: {
      orgSlug,
      branchId: branches.length > 0 ? branches[0].id : '',
      petSpecies: 'Dog',
      preferredTime: '09:00',
    },
  });

  const onSubmit = async (data: AppointmentRequestInput) => {
    setIsLoading(true);
    setError(null);
    try {
      const res = await createAppointmentRequestAction(data);
      if (res.success) {
        setSuccess(true);
      } else {
        setError(res.error || 'Failed to submit booking request.');
      }
    } catch (err: any) {
      setError(err.message || 'An unexpected error occurred.');
    } finally {
      setIsLoading(false);
    }
  };

  if (success) {
    return (
      <div className="text-center p-6 bg-emerald-500/5 border border-emerald-500/20 rounded-2xl space-y-4">
        <div className="w-12 h-12 bg-emerald-500/10 flex items-center justify-center rounded-full mx-auto">
          <CheckCircle2 className="w-6 h-6 text-emerald-600" />
        </div>
        <h3 className="text-base font-bold text-primary-navy">Booking Request Submitted!</h3>
        <p className="text-xs text-graphite/70 leading-relaxed max-w-sm mx-auto">
          We have recorded your appointment preferences. Please check your email inbox shortly for confirmation updates.
        </p>
      </div>
    );
  }

  return (
    <form onSubmit={handleSubmit(onSubmit)} className="space-y-4">
      {error && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* Target Branch selection */}
      <div>
        <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
          Select Clinic Branch
        </label>
        <select
          {...register('branchId')}
          className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy font-bold outline-none"
        >
          {branches.map((b) => (
            <option key={b.id} value={b.id}>
              {b.name} {b.address ? `(${b.address})` : ''}
            </option>
          ))}
        </select>
        {errors.branchId && (
          <span className="text-[10px] text-destructive mt-1 block">{errors.branchId.message}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
            Pet Parent Name
          </label>
          <input
            type="text"
            {...register('customerName')}
            placeholder="e.g. John Doe"
            className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
          />
          {errors.customerName && (
            <span className="text-[10px] text-destructive mt-1 block">{errors.customerName.message}</span>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
            Parent Contact Phone
          </label>
          <input
            type="text"
            {...register('customerPhone')}
            placeholder="e.g. +1 555-9090"
            className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
          />
          {errors.customerPhone && (
            <span className="text-[10px] text-destructive mt-1 block">{errors.customerPhone.message}</span>
          )}
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
          Parent Email Address
        </label>
        <input
          type="email"
          {...register('customerEmail')}
          placeholder="e.g. parent@example.com"
          className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
        />
        {errors.customerEmail && (
          <span className="text-[10px] text-destructive mt-1 block">{errors.customerEmail.message}</span>
        )}
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
            Pet Name
          </label>
          <input
            type="text"
            {...register('petName')}
            placeholder="e.g. Max"
            className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
          />
          {errors.petName && (
            <span className="text-[10px] text-destructive mt-1 block">{errors.petName.message}</span>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
            Pet Species
          </label>
          <select
            {...register('petSpecies')}
            className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy font-bold outline-none"
          >
            <option value="Dog">Dog</option>
            <option value="Cat">Cat</option>
            <option value="Bird">Bird</option>
            <option value="Exotic">Exotic / Other</option>
          </select>
        </div>
      </div>

      <div className="grid grid-cols-2 gap-4">
        <div>
          <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
            Preferred Date
          </label>
          <input
            type="date"
            {...register('preferredDate')}
            className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
          />
          {errors.preferredDate && (
            <span className="text-[10px] text-destructive mt-1 block">{errors.preferredDate.message}</span>
          )}
        </div>
        <div>
          <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
            Preferred Time Slot
          </label>
          <select
            {...register('preferredTime')}
            className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy font-bold outline-none"
          >
            <option value="09:00">09:00 AM</option>
            <option value="10:00">10:00 AM</option>
            <option value="11:00">11:00 AM</option>
            <option value="12:00">12:00 PM</option>
            <option value="14:00">02:00 PM</option>
            <option value="15:00">03:00 PM</option>
            <option value="16:00">04:00 PM</option>
          </select>
        </div>
      </div>

      <div>
        <label className="block text-[10px] font-semibold text-primary-navy/80 uppercase tracking-wider mb-1.5">
          Reason for Appointment / Description
        </label>
        <textarea
          {...register('reason')}
          placeholder="Briefly describe what checkup or treatment is needed..."
          rows={3}
          className="w-full px-3 py-2 bg-primary-ivory/30 border border-border focus:border-primary-teal focus:ring-1 focus:ring-primary-teal rounded-xl text-xs text-primary-navy outline-none"
        />
        {errors.reason && (
          <span className="text-[10px] text-destructive mt-1 block">{errors.reason.message}</span>
        )}
      </div>

      <button
        type="submit"
        disabled={isLoading}
        className="w-full bg-primary-navy hover:bg-primary-teal text-white py-3.5 rounded-xl text-xs font-bold shadow-premium transition-all flex items-center justify-center gap-1.5 disabled:opacity-75"
      >
        {isLoading ? (
          <>
            <Loader2 className="w-3.5 h-3.5 animate-spin" />
            Submitting Request...
          </>
        ) : (
          <>
            <span>Submit Appointment Request</span>
            <ArrowRight className="w-4 h-4" />
          </>
        )}
      </button>
    </form>
  );
}
