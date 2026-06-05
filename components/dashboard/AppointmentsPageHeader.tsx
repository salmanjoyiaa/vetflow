'use client';

import { useSearchParams } from 'next/navigation';
import PageHeader from '@/components/ui/premium/PageHeader';
import StaffAppointmentForm from '@/components/forms/StaffAppointmentForm';
import { Calendar, Link as LinkIcon, ExternalLink } from 'lucide-react';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface AppointmentsPageHeaderProps {
  orgSlug?: string;
  publicBookingUrl: string;
  doctors: Doctor[];
  activeBranchId: string;
}

export default function AppointmentsPageHeader({
  orgSlug,
  publicBookingUrl,
  doctors,
  activeBranchId,
}: AppointmentsPageHeaderProps) {
  const searchParams = useSearchParams();
  const openNew = searchParams.get('new') === '1';

  return (
    <PageHeader
      title="Appointments"
      description="Create linked appointments, manage schedules, and handle emergencies."
      icon={Calendar}
      actions={
        <div className="flex flex-wrap items-center gap-3">
          <StaffAppointmentForm
            doctors={doctors}
            activeBranchId={activeBranchId}
            defaultOpen={openNew}
          />
          {orgSlug && (
            <div className="glass-panel p-3 rounded-2xl flex items-center gap-3 text-xs font-semibold text-on-surface">
              <LinkIcon className="w-4 h-4 text-primary" />
              <div>
                <span className="text-[9px] text-on-surface-variant block uppercase">
                  Client booking link
                </span>
                <a
                  href={publicBookingUrl}
                  target="_blank"
                  rel="noopener noreferrer"
                  className="text-primary hover:underline inline-flex items-center gap-1 font-bold"
                >
                  /book/{orgSlug}
                  <ExternalLink className="w-3 h-3" />
                </a>
              </div>
            </div>
          )}
        </div>
      }
    />
  );
}
