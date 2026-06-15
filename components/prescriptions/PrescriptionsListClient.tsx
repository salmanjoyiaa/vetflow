'use client';

import { useCallback, useState } from 'react';
import Link from 'next/link';
import FullScreenOverlay from '@/components/ui/premium/FullScreenOverlay';
import PetMedicalProfileClient from '@/components/pets/PetMedicalProfileClient';
import { getPatientMedicalProfileAction } from '@/lib/services/patient-medical-actions';
import type { PatientMedicalProfileData } from '@/lib/types/patient-medical';
import { FileText, Download, ExternalLink, AlertTriangle, Loader2, ChevronRight } from 'lucide-react';

export type PrescriptionListRow = {
  id: string;
  revisionNumber: number;
  isFinalized: boolean;
  createdAt: string;
  petId: string | null;
  petName: string;
  petSpecies: string;
  doctorFirstName: string | null;
  doctorLastName: string | null;
  visitReason: string | null;
  isEmergency: boolean;
};

interface PrescriptionsListClientProps {
  prescriptions: PrescriptionListRow[];
  userRole: string | null;
}

function canUploadPhoto(role: string | null): boolean {
  return role === 'doctor' || role === 'receptionist' || role === 'clinic_admin';
}

function canEditClinical(role: string | null): boolean {
  return role === 'doctor' || role === 'clinic_admin';
}

function canEditCare(role: string | null): boolean {
  return role === 'doctor' || role === 'receptionist' || role === 'clinic_admin';
}

export default function PrescriptionsListClient({
  prescriptions,
  userRole,
}: PrescriptionsListClientProps) {
  const [overlayOpen, setOverlayOpen] = useState(false);
  const [activePetId, setActivePetId] = useState<string | null>(null);
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [profile, setProfile] = useState<PatientMedicalProfileData | null>(null);

  const loadProfile = useCallback(async (petId: string) => {
    setLoading(true);
    setError(null);
    const res = await getPatientMedicalProfileAction(petId);
    setLoading(false);
    if (res.success && res.data) {
      setProfile(res.data);
    } else {
      setProfile(null);
      setError(res.error || 'Failed to load medical profile');
    }
  }, []);

  const openMedicalFile = (petId: string) => {
    setActivePetId(petId);
    setOverlayOpen(true);
    void loadProfile(petId);
  };

  const closeOverlay = () => {
    setOverlayOpen(false);
    setActivePetId(null);
    setProfile(null);
    setError(null);
  };

  if (prescriptions.length === 0) {
    return (
      <div className="p-10 text-center">
        <FileText className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
        <p className="text-xs text-on-surface-variant/40">
          No prescriptions recorded for this branch yet.
        </p>
        <Link
          href="/dashboard/doctors"
          className="text-xs text-primary font-semibold mt-2 inline-block hover:underline"
        >
          Open doctor queue →
        </Link>
      </div>
    );
  }

  return (
    <>
      <div className="divide-y divide-border/20">
        {prescriptions.map((rx) => (
          <div
            key={rx.id}
            className="px-5 py-4 flex flex-col sm:flex-row sm:items-center justify-between gap-3 hover:bg-surface-container/30 transition-colors"
          >
            <div>
              <span className="text-xs font-bold text-on-surface block flex items-center gap-2 flex-wrap">
                {rx.petName}{' '}
                <span className="text-on-surface-variant/40 font-normal">({rx.petSpecies})</span>
                {rx.isEmergency && (
                  <span className="text-[9px] font-bold text-destructive inline-flex items-center gap-0.5 bg-destructive/10 border border-destructive/20 px-1.5 py-0.5 rounded-full">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    Emergency
                  </span>
                )}
              </span>
              <span className="text-[10px] text-on-surface-variant block mt-0.5">
                Dr. {rx.doctorFirstName} {rx.doctorLastName} • Rev {rx.revisionNumber} •{' '}
                {new Date(rx.createdAt).toLocaleDateString()}
              </span>
              {rx.visitReason && (
                <span className="text-[10px] text-on-surface-variant/40 block mt-0.5">
                  Visit: {rx.visitReason.substring(0, 60)}
                </span>
              )}
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <span
                className={`text-[10px] font-bold px-2 py-0.5 rounded-full ${
                  rx.isFinalized
                    ? 'bg-emerald-500/10 text-emerald-400 border border-emerald-500/20'
                    : 'bg-amber-500/10 text-amber-400 border border-amber-500/20'
                }`}
              >
                {rx.isFinalized ? 'Finalized' : 'Draft'}
              </span>
              {rx.petId && (
                <button
                  type="button"
                  onClick={() => openMedicalFile(rx.petId!)}
                  className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline"
                >
                  Medical file <ExternalLink className="w-3 h-3" />
                </button>
              )}
              <a
                href={`/api/prescriptions/${rx.id}/pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-semibold text-on-surface bg-surface-container border border-outline-variant/40 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:border-primary-teal transition-colors"
              >
                <Download className="w-3 h-3" />
                PDF
              </a>
            </div>
          </div>
        ))}
      </div>

      <FullScreenOverlay
        open={overlayOpen}
        onClose={closeOverlay}
        breadcrumb={
          profile ? (
            <span className="flex items-center gap-1">
              Patients <ChevronRight className="w-3 h-3" />
              <span className="text-primary-container">
                {profile.petName}
                {profile.patientNumber ? ` (ID: ${profile.patientNumber})` : ''}
              </span>
            </span>
          ) : (
            'Patient medical profile'
          )
        }
      >
        {loading && (
          <div className="flex items-center justify-center py-24 text-on-surface-variant">
            <Loader2 className="w-8 h-8 animate-spin" />
          </div>
        )}
        {!loading && error && (
          <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
            {error}
          </div>
        )}
        {!loading && !error && profile && (
          <PetMedicalProfileClient
            profile={profile}
            variant="overlay"
            editable={canEditClinical(userRole)}
            canUploadPhoto={canUploadPhoto(userRole)}
            canEditCareNotes={canEditCare(userRole)}
            userRole={userRole}
            onRefresh={() => activePetId && loadProfile(activePetId)}
          />
        )}
      </FullScreenOverlay>
    </>
  );
}
