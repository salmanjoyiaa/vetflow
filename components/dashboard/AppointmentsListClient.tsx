'use client';

import { useState } from 'react';
import { confirmAppointmentAction, checkInAppointmentAction } from '@/lib/services/appointment-actions';
import { Calendar, User, Clock, CheckCircle2, UserCheck, XCircle, Loader2 } from 'lucide-react';
import { useRouter } from 'next/navigation';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface Appointment {
  id: string;
  customer_name: string;
  customer_email: string;
  customer_phone: string;
  pet_name: string;
  pet_species: string | null;
  preferred_date: string;
  preferred_time: string;
  reason: string;
  status: string;
}

interface AppointmentsListClientProps {
  initialAppointments: Appointment[];
  doctors: Doctor[];
}

export default function AppointmentsListClient({
  initialAppointments,
  doctors,
}: AppointmentsListClientProps) {
  const router = useRouter();
  const [updatingId, setUpdatingId] = useState<string | null>(null);
  const [selectedDoctorMap, setSelectedDoctorMap] = useState<Record<string, string>>({});

  const handleConfirm = async (apptId: string) => {
    setUpdatingId(apptId);
    try {
      const res = await confirmAppointmentAction(apptId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to confirm appointment');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  const handleCheckIn = async (apptId: string) => {
    const docId = selectedDoctorMap[apptId] || (doctors.length > 0 ? doctors[0].id : '');
    if (!docId) {
      alert('Please assign a doctor first.');
      return;
    }
    setUpdatingId(apptId);
    try {
      const res = await checkInAppointmentAction(apptId, docId);
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to check-in patient');
      }
    } catch (err: any) {
      alert(err.message || 'An error occurred');
    } finally {
      setUpdatingId(null);
    }
  };

  if (initialAppointments.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center shadow-premium">
        <Calendar className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <h4 className="text-sm font-bold text-on-surface mb-1">No Appointments Requested</h4>
        <p className="text-xs text-on-surface-variant/60">Share your public booking link to receive requests.</p>
      </div>
    );
  }

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
      <table className="w-full text-left border-collapse">
        <thead>
          <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
            <th className="px-6 py-4">Pet Details</th>
            <th className="px-6 py-4">Owner Contact</th>
            <th className="px-6 py-4">Preferred Slot</th>
            <th className="px-6 py-4">Reason</th>
            <th className="px-6 py-4">Status</th>
            <th className="px-6 py-4 text-right">Actions</th>
          </tr>
        </thead>
        <tbody className="divide-y divide-border/30 text-xs">
          {initialAppointments.map((appt) => (
            <tr key={appt.id} className="hover:bg-surface-container/10 transition-colors">
              <td className="px-6 py-4">
                <span className="font-bold text-on-surface block">{appt.pet_name}</span>
                <span className="text-[10px] text-on-surface-variant/50 block capitalize">
                  Species: {appt.pet_species || 'Dog'}
                </span>
              </td>
              <td className="px-6 py-4 space-y-0.5 text-on-surface-variant/70">
                <span className="font-semibold text-on-surface block">{appt.customer_name}</span>
                <span>{appt.customer_phone}</span>
                <span className="block text-[10px]">{appt.customer_email}</span>
              </td>
              <td className="px-6 py-4 space-y-0.5 text-on-surface-variant/80 font-medium">
                <div>Date: {appt.preferred_date}</div>
                <div className="text-[10px] text-on-surface-variant/50">Time: {appt.preferred_time}</div>
              </td>
              <td className="px-6 py-4 text-on-surface-variant/80 max-w-xs truncate" title={appt.reason}>
                {appt.reason}
              </td>
              <td className="px-6 py-4">
                {appt.status === 'requested' && (
                  <span className="inline-flex items-center gap-1 bg-amber-500/10 text-amber-700 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Requested
                  </span>
                )}
                {appt.status === 'confirmed' && (
                  <span className="inline-flex items-center gap-1 bg-primary/10 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                    Confirmed
                  </span>
                )}
                {appt.status === 'checked_in' && (
                  <span className="inline-flex items-center gap-1 bg-emerald-500/10 text-emerald-600 px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <CheckCircle2 className="w-3 h-3" />
                    Checked In
                  </span>
                )}
                {appt.status === 'cancelled' && (
                  <span className="inline-flex items-center gap-1 bg-destructive/10 text-destructive px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <XCircle className="w-3 h-3" />
                    Cancelled
                  </span>
                )}
              </td>
              <td className="px-6 py-4 text-right">
                <div className="inline-flex items-center gap-2">
                  
                  {appt.status === 'requested' && (
                    <button
                      disabled={updatingId !== null}
                      onClick={() => handleConfirm(appt.id)}
                      className="bg-primary hover:bg-primary/95 text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all flex items-center gap-1"
                    >
                      {updatingId === appapptId(appt.id) ? (
                        <Loader2 className="w-3 h-3 animate-spin" />
                      ) : (
                        'Approve Request'
                      )}
                    </button>
                  )}

                  {appt.status === 'confirmed' && (
                    <div className="flex items-center gap-2">
                      <select
                        className="px-2 py-1 bg-surface-container border border-outline-variant rounded-lg text-[10px] font-semibold text-on-surface outline-none"
                        value={selectedDoctorMap[appt.id] || (doctors.length > 0 ? doctors[0].id : '')}
                        onChange={(e) => setSelectedDoctorMap({ ...selectedDoctorMap, [appt.id]: e.target.value })}
                      >
                        {doctors.map((d) => (
                          <option key={d.id} value={d.id}>
                            Dr. {d.firstName}
                          </option>
                        ))}
                      </select>

                      <button
                        disabled={updatingId !== null}
                        onClick={() => handleCheckIn(appt.id)}
                        className="bg-primary hover:bg-primary text-white px-2.5 py-1.5 rounded-lg text-[10px] font-bold shadow-sm transition-all"
                      >
                        {updatingId === appapptId(appt.id) ? (
                          <Loader2 className="w-3 h-3 animate-spin" />
                        ) : (
                          'Check-In Room'
                        )}
                      </button>
                    </div>
                  )}

                  {['checked_in', 'cancelled'].includes(appt.status) && (
                    <span className="text-[10px] text-on-surface-variant/40 italic">No Actions</span>
                  )}

                </div>
              </td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}

// Simple internal helper to match updating state
function appapptId(id: string) {
  return id;
}

