'use client';

import { useRef, useState } from 'react';
import Link from 'next/link';
import Image from 'next/image';
import type { PatientMedicalProfileData, PatientVisitRow } from '@/lib/types/patient-medical';
import {
  updateClinicalNoteAction,
  updatePatientCareNotesAction,
  uploadPatientPhotoAction,
} from '@/lib/services/patient-medical-actions';
import { uploadVisitDocumentAction, deleteDocumentAction } from '@/lib/services/document-actions';
import MedicalRecordActivityPanel from '@/components/dashboard/MedicalRecordActivityPanel';
import Button from '@/components/ui/premium/Button';
import Select from '@/components/ui/premium/Select';
import Textarea from '@/components/ui/premium/Textarea';
import {
  computePetAgeLabel,
  formatVisitStatusLabel,
  getPetSpeciesAvatarSrc,
} from '@/lib/utils/pet-species-avatar';
import { useCurrency } from '@/lib/context/CurrencyContext';
import {
  AlertTriangle,
  Camera,
  ChevronRight,
  ExternalLink,
  FileText,
  FlaskConical,
  Mail,
  Pencil,
  Phone,
  Pill,
  Receipt,
  Stethoscope,
  Trash2,
  Upload,
  User,
} from 'lucide-react';

type TabKey = 'history' | 'labs' | 'billing' | 'care' | 'recommendations';

interface PetMedicalProfileClientProps {
  profile: PatientMedicalProfileData;
  variant?: 'overlay' | 'page';
  editable?: boolean;
  canUploadPhoto?: boolean;
  canEditCareNotes?: boolean;
  userRole?: string | null;
  onRefresh?: () => void;
}

const TABS: { key: TabKey; label: string }[] = [
  { key: 'history', label: 'Medical History' },
  { key: 'labs', label: 'Lab Reports' },
  { key: 'billing', label: 'Billing' },
  { key: 'care', label: 'Special Care & Allergies' },
  { key: 'recommendations', label: 'Recommendations' },
];

function emptyNoteForm(visit: PatientVisitRow) {
  const n = visit.notes;
  return {
    visitType: (n?.visit_type as 'standard' | 'lab' | 'surgery') || 'standard',
    chiefComplaint: n?.chief_complaint || visit.reason || '',
    history: n?.history || '',
    examinationFindings: n?.examination_findings || '',
    diagnosis: n?.diagnosis || '',
    treatmentPlan: n?.treatment_plan || '',
    procedureNotes: n?.procedure_notes || '',
    postOpMedication: n?.post_op_medication || '',
    internalNotes: n?.internal_notes || '',
    followUpRecommendation: n?.follow_up_recommendation || '',
    followUpDays: (n?.follow_up_days ?? []).join(', '),
    temperatureC: n?.temperature_c?.toString() ?? '',
    heartRateBpm: n?.heart_rate_bpm?.toString() ?? '',
    respiratoryRate: n?.respiratory_rate?.toString() ?? '',
    weightKg: n?.weight_kg?.toString() ?? '',
  };
}

export default function PetMedicalProfileClient({
  profile,
  variant = 'overlay',
  editable = false,
  canUploadPhoto = false,
  canEditCareNotes = false,
  onRefresh,
}: PetMedicalProfileClientProps) {
  const { formatCurrency } = useCurrency();
  const [activeTab, setActiveTab] = useState<TabKey>('history');
  const [error, setError] = useState<string | null>(null);
  const [expandedVisitId, setExpandedVisitId] = useState<string | null>(
    profile.visits[0]?.id ?? null
  );
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [savingVisitId, setSavingVisitId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState(emptyNoteForm(profile.visits[0] ?? ({} as PatientVisitRow)));
  const [uploadingPhoto, setUploadingPhoto] = useState(false);
  const [uploadVisitId, setUploadVisitId] = useState(profile.visits[0]?.id ?? '');
  const [uploadingDoc, setUploadingDoc] = useState(false);
  const [deletingDoc, setDeletingDoc] = useState<string | null>(null);
  const [editingCare, setEditingCare] = useState(false);
  const [savingCare, setSavingCare] = useState(false);
  const [careForm, setCareForm] = useState({
    allergies: profile.allergies || '',
    medicalNotes: profile.medicalNotes || '',
    weightKg: profile.weightKg?.toString() ?? '',
  });
  const [photoUrl, setPhotoUrl] = useState(profile.photoUrl);

  const photoInputRef = useRef<HTMLInputElement>(null);
  const docInputRef = useRef<HTMLInputElement>(null);

  const statusInfo = formatVisitStatusLabel(profile.latestVisitStatus);
  const ageLabel = computePetAgeLabel(profile.dateOfBirth);
  const fallbackAvatar = getPetSpeciesAvatarSrc(profile.species);

  const refresh = () => onRefresh?.();

  const allLabOrders = profile.visits.flatMap((v) => v.labOrders);
  const recommendations = profile.visits
    .filter((v) => v.notes?.follow_up_recommendation)
    .map((v) => ({
      visitId: v.id,
      date: v.checked_in_at,
      text: v.notes!.follow_up_recommendation!,
      days: v.notes?.follow_up_days,
    }));

  const onPhotoUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setUploadingPhoto(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('patientId', profile.petId);
    const res = await uploadPatientPhotoAction(fd);
    setUploadingPhoto(false);
    e.target.value = '';
    if (res.success && res.photoUrl) {
      setPhotoUrl(res.photoUrl);
      refresh();
    } else {
      setError(res.error || 'Photo upload failed');
    }
  };

  const onDocUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadVisitId) return;
    setUploadingDoc(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('visitId', uploadVisitId);
    fd.append('patientId', profile.petId);
    fd.append('category', 'medical_record');
    const res = await uploadVisitDocumentAction(fd);
    setUploadingDoc(false);
    e.target.value = '';
    if (res.success) refresh();
    else setError(res.error || 'Upload failed');
  };

  const onDeleteDoc = async (docId: string) => {
    setDeletingDoc(docId);
    const res = await deleteDocumentAction(docId);
    setDeletingDoc(null);
    if (res.success) refresh();
    else setError(res.error || 'Delete failed');
  };

  const startEdit = (visit: PatientVisitRow) => {
    setEditingVisitId(visit.id);
    setEditForm(emptyNoteForm(visit));
    setExpandedVisitId(visit.id);
    setError(null);
  };

  const cancelEdit = () => {
    setEditingVisitId(null);
    setError(null);
  };

  const parseNum = (v: string) => {
    const n = parseFloat(v);
    return v.trim() === '' || Number.isNaN(n) ? undefined : n;
  };

  const onSaveNote = async (visitId: string) => {
    setSavingVisitId(visitId);
    setError(null);
    const followUpDays = editForm.followUpDays
      .split(',')
      .map((s) => parseInt(s.trim(), 10))
      .filter((n) => !Number.isNaN(n) && n > 0);

    const res = await updateClinicalNoteAction({
      visitId,
      visitType: editForm.visitType,
      chiefComplaint: editForm.chiefComplaint.trim(),
      history: editForm.history.trim(),
      examinationFindings: editForm.examinationFindings.trim(),
      diagnosis: editForm.diagnosis.trim(),
      treatmentPlan: editForm.treatmentPlan.trim(),
      procedureNotes: editForm.procedureNotes.trim(),
      postOpMedication: editForm.postOpMedication.trim(),
      internalNotes: editForm.internalNotes.trim(),
      followUpRecommendation: editForm.followUpRecommendation.trim(),
      followUpDays,
      temperatureC: parseNum(editForm.temperatureC),
      heartRateBpm: parseNum(editForm.heartRateBpm),
      respiratoryRate: parseNum(editForm.respiratoryRate),
      weightKg: parseNum(editForm.weightKg),
    });
    setSavingVisitId(null);
    if (res.success) {
      setEditingVisitId(null);
      refresh();
    } else {
      setError(res.error || 'Failed to save clinical notes');
    }
  };

  const onSaveCare = async () => {
    setSavingCare(true);
    setError(null);
    const res = await updatePatientCareNotesAction({
      patientId: profile.petId,
      allergies: careForm.allergies.trim(),
      medicalNotes: careForm.medicalNotes.trim(),
      weightKg: parseNum(careForm.weightKg),
    });
    setSavingCare(false);
    if (res.success) {
      setEditingCare(false);
      refresh();
    } else {
      setError(res.error || 'Failed to save care notes');
    }
  };

  const visitOptions = profile.visits.map((v) => ({
    value: v.id,
    label: `${new Date(v.checked_in_at || '').toLocaleDateString()} — ${v.reason || 'Visit'}`,
  }));

  return (
    <div className="space-y-8">
      {variant === 'page' && profile.owner && (
        <Link
          href={`/dashboard/customers/${profile.owner.id}`}
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary font-semibold"
        >
          Back to owner profile
        </Link>
      )}

      <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
        <div className="md:col-span-8 glass-panel rounded-xl p-6 flex flex-col md:flex-row gap-6 items-start relative overflow-hidden">
          <div className="absolute top-0 right-0 w-64 h-64 bg-primary-container/10 blur-[50px] -translate-y-1/2 translate-x-1/4 rounded-full pointer-events-none" />

          <div className="relative shrink-0 group">
            <div className="w-32 h-32 md:w-40 md:h-40 rounded-full overflow-hidden border-2 border-outline-variant/50 bg-surface-container-high shadow-lg">
              {photoUrl ? (
                <img src={photoUrl} alt={profile.petName} className="w-full h-full object-cover" />
              ) : (
                <Image
                  src={fallbackAvatar}
                  alt={`${profile.species} placeholder`}
                  width={160}
                  height={160}
                  className="w-full h-full object-cover p-4"
                />
              )}
            </div>
            {canUploadPhoto && (
              <>
                <input
                  ref={photoInputRef}
                  type="file"
                  accept="image/*"
                  className="hidden"
                  onChange={onPhotoUpload}
                />
                <button
                  type="button"
                  onClick={() => photoInputRef.current?.click()}
                  disabled={uploadingPhoto}
                  className="absolute bottom-1 right-1 p-2 rounded-full bg-primary text-on-primary shadow-md hover:opacity-90 transition-opacity"
                  title="Upload photo"
                >
                  <Camera className="w-4 h-4" />
                </button>
              </>
            )}
          </div>

          <div className="flex-1 w-full z-10">
            <div className="flex flex-wrap justify-between items-start gap-3 mb-2">
              <div>
                <h2 className="text-2xl md:text-4xl font-bold text-on-surface mb-1">
                  {profile.petName}
                </h2>
                <p className="text-sm text-on-surface-variant capitalize flex items-center gap-2">
                  {profile.species}
                  {profile.breed && (
                    <>
                      <span className="w-1 h-1 rounded-full bg-outline-variant" />
                      {profile.breed}
                    </>
                  )}
                </p>
              </div>
              <div className="flex items-center gap-2 px-3 py-1.5 bg-surface-container-high/50 rounded-full border border-outline-variant/30">
                <span
                  className={`w-2 h-2 rounded-full ${
                    statusInfo.tone === 'stable'
                      ? 'bg-primary-container shadow-[0_0_8px_2px_rgba(116,245,255,0.4)]'
                      : statusInfo.tone === 'active'
                        ? 'bg-secondary shadow-[0_0_8px_2px_rgba(235,178,255,0.4)]'
                        : 'bg-destructive shadow-[0_0_8px_2px_rgba(255,180,171,0.4)]'
                  }`}
                />
                <span className="text-xs font-semibold text-primary-container uppercase tracking-wider">
                  {statusInfo.label}
                </span>
              </div>
            </div>

            <div className="grid grid-cols-2 sm:grid-cols-4 gap-4 mt-6 border-t border-outline-variant/20 pt-6">
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Age</p>
                <p className="text-sm font-medium text-on-surface">{ageLabel || '—'}</p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Weight</p>
                <p className="text-sm font-medium text-on-surface">
                  {profile.weightKg != null ? `${profile.weightKg} kg` : '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Sex</p>
                <p className="text-sm font-medium text-on-surface capitalize">
                  {profile.gender || '—'}
                </p>
              </div>
              <div>
                <p className="text-[10px] font-bold text-on-surface-variant uppercase mb-1">Patient ID</p>
                <p className="text-sm font-medium text-on-surface font-mono">
                  {profile.patientNumber || profile.petId.slice(0, 8)}
                </p>
              </div>
            </div>
          </div>
        </div>

        <div className="md:col-span-4 glass-panel rounded-xl p-6 flex flex-col">
          <div className="flex items-center justify-between mb-6">
            <h3 className="text-lg font-bold text-on-surface flex items-center gap-2">
              <User className="w-5 h-5 text-primary-container" />
              Owner Profile
            </h3>
            {profile.owner && (
              <Link
                href={`/dashboard/customers/${profile.owner.id}`}
                className="text-on-surface-variant hover:text-primary"
              >
                <ExternalLink className="w-4 h-4" />
              </Link>
            )}
          </div>
          {profile.owner ? (
            <div className="space-y-4 flex-1 text-sm">
              <div>
                <p className="font-medium text-on-surface">{profile.owner.name}</p>
                <p className="text-on-surface-variant text-xs">Primary Contact</p>
              </div>
              {profile.owner.phone && (
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <Phone className="w-4 h-4 shrink-0" />
                  <span>{profile.owner.phone}</span>
                </div>
              )}
              {profile.owner.email && (
                <div className="flex items-center gap-3 text-on-surface-variant">
                  <Mail className="w-4 h-4 shrink-0" />
                  <span className="truncate">{profile.owner.email}</span>
                </div>
              )}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant">No owner on file.</p>
          )}
        </div>
      </div>

      {profile.activities.length > 0 && (
        <MedicalRecordActivityPanel activities={profile.activities} />
      )}

      <div className="border-b border-outline-variant/30 flex gap-6 overflow-x-auto">
        {TABS.map((tab) => (
          <button
            key={tab.key}
            type="button"
            onClick={() => setActiveTab(tab.key)}
            className={`pb-3 px-1 text-xs font-semibold whitespace-nowrap transition-colors ${
              activeTab === tab.key
                ? 'text-primary-container border-b-2 border-primary-container'
                : 'text-on-surface-variant hover:text-on-surface'
            }`}
          >
            {tab.label}
          </button>
        ))}
      </div>

      {error && (
        <div className="bg-destructive/10 border border-destructive/30 text-destructive text-xs p-4 rounded-xl">
          {error}
        </div>
      )}

      {activeTab === 'history' && (
        <div className="grid grid-cols-1 md:grid-cols-12 gap-6">
          <div className="md:col-span-4 glass-panel rounded-xl p-6">
            <h4 className="text-sm font-bold text-on-surface mb-6">Treatment Timeline</h4>
            <div className="space-y-6 relative">
              <div className="absolute left-[11px] top-2 bottom-2 w-0.5 bg-outline-variant/30" />
              {profile.visits.map((visit, idx) => (
                <button
                  key={visit.id}
                  type="button"
                  onClick={() => setExpandedVisitId(visit.id)}
                  className="relative pl-10 text-left w-full group"
                >
                  <div
                    className={`absolute left-0 top-1.5 w-6 h-6 rounded-full border-2 flex items-center justify-center ${
                      idx === 0
                        ? 'bg-surface-container-high border-primary-container'
                        : 'bg-surface-container-high border-outline-variant'
                    }`}
                  >
                    <div
                      className={`w-2 h-2 rounded-full ${
                        idx === 0 ? 'bg-primary-container' : 'bg-outline-variant'
                      }`}
                    />
                  </div>
                  <p className="text-[10px] font-bold text-primary-container mb-1">
                    {visit.checked_in_at
                      ? new Date(visit.checked_in_at).toLocaleDateString()
                      : 'Unknown'}
                  </p>
                  <p className="text-sm font-medium text-on-surface group-hover:text-primary transition-colors">
                    {visit.notes?.chief_complaint || visit.reason || 'Visit'}
                  </p>
                  <p className="text-xs text-on-surface-variant line-clamp-2">
                    {visit.notes?.diagnosis || visit.status}
                  </p>
                </button>
              ))}
              {profile.visits.length === 0 && (
                <p className="text-xs text-on-surface-variant italic">No visits recorded.</p>
              )}
            </div>
          </div>

          <div className="md:col-span-8 space-y-4">
            <div className="glass-panel rounded-xl p-4 space-y-3">
              <h4 className="text-sm font-bold text-on-surface">Upload medical file</h4>
              {visitOptions.length > 0 ? (
                <>
                  <Select
                    label="Link to visit"
                    value={uploadVisitId}
                    onChange={setUploadVisitId}
                    options={visitOptions}
                  />
                  <input
                    ref={docInputRef}
                    type="file"
                    className="hidden"
                    accept=".pdf,image/*"
                    onChange={onDocUpload}
                  />
                  <Button
                    type="button"
                    variant="secondary"
                    loading={uploadingDoc}
                    icon={<Upload className="w-4 h-4" />}
                    onClick={() => docInputRef.current?.click()}
                  >
                    Upload document
                  </Button>
                </>
              ) : (
                <p className="text-xs text-on-surface-variant">No visits yet.</p>
              )}
            </div>

            {profile.visits.map((visit) => {
              const isExpanded = expandedVisitId === visit.id;
              const isEditing = editingVisitId === visit.id;
              const notes = visit.notes;

              return (
                <div
                  key={visit.id}
                  className={`glass-panel rounded-xl p-6 space-y-4 transition-all ${
                    isExpanded ? 'ring-1 ring-primary-container/30' : ''
                  }`}
                >
                  <div className="flex flex-wrap justify-between gap-2">
                    <div>
                      <p className="text-xs font-bold text-on-surface">
                        {visit.checked_in_at
                          ? new Date(visit.checked_in_at).toLocaleString()
                          : 'Unknown date'}
                      </p>
                      <p className="text-[10px] text-on-surface-variant mt-0.5 flex items-center gap-2 flex-wrap">
                        <Stethoscope className="w-3 h-3" />
                        {visit.doctorName || 'Unassigned'} · {visit.status}
                        {visit.is_emergency && (
                          <span className="text-destructive font-bold">Emergency</span>
                        )}
                      </p>
                    </div>
                    <div className="flex items-center gap-2">
                      <button
                        type="button"
                        onClick={() =>
                          setExpandedVisitId(isExpanded ? null : visit.id)
                        }
                        className="text-[10px] font-semibold text-on-surface-variant hover:text-primary"
                      >
                        {isExpanded ? 'Collapse' : 'Expand'}
                      </button>
                      {editable && !isEditing && (
                        <button
                          type="button"
                          onClick={() => startEdit(visit)}
                          className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline"
                        >
                          <Pencil className="w-3 h-3" />
                          Edit
                        </button>
                      )}
                    </div>
                  </div>

                  {isExpanded && (
                    <>
                      {isEditing ? (
                        <div className="space-y-3 border-t border-outline-variant/30 pt-4">
                          <Textarea
                            label="Chief complaint"
                            value={editForm.chiefComplaint}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, chiefComplaint: e.target.value }))
                            }
                          />
                          <Textarea
                            label="History"
                            value={editForm.history}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, history: e.target.value }))
                            }
                          />
                          <Textarea
                            label="Examination findings"
                            value={editForm.examinationFindings}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, examinationFindings: e.target.value }))
                            }
                          />
                          <Textarea
                            label="Diagnosis"
                            value={editForm.diagnosis}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, diagnosis: e.target.value }))
                            }
                          />
                          <Textarea
                            label="Treatment plan"
                            value={editForm.treatmentPlan}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, treatmentPlan: e.target.value }))
                            }
                          />
                          <Textarea
                            label="Procedure notes"
                            value={editForm.procedureNotes}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, procedureNotes: e.target.value }))
                            }
                          />
                          <Textarea
                            label="Post-op medication"
                            value={editForm.postOpMedication}
                            onChange={(e) =>
                              setEditForm((f) => ({ ...f, postOpMedication: e.target.value }))
                            }
                          />
                          <Textarea
                            label="Follow-up recommendation"
                            value={editForm.followUpRecommendation}
                            onChange={(e) =>
                              setEditForm((f) => ({
                                ...f,
                                followUpRecommendation: e.target.value,
                              }))
                            }
                          />
                          <div className="grid grid-cols-2 sm:grid-cols-4 gap-3">
                            <Textarea
                              label="Temp (°C)"
                              value={editForm.temperatureC}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, temperatureC: e.target.value }))
                              }
                              className="min-h-[44px]"
                            />
                            <Textarea
                              label="HR (bpm)"
                              value={editForm.heartRateBpm}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, heartRateBpm: e.target.value }))
                              }
                              className="min-h-[44px]"
                            />
                            <Textarea
                              label="RR (/min)"
                              value={editForm.respiratoryRate}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, respiratoryRate: e.target.value }))
                              }
                              className="min-h-[44px]"
                            />
                            <Textarea
                              label="Weight (kg)"
                              value={editForm.weightKg}
                              onChange={(e) =>
                                setEditForm((f) => ({ ...f, weightKg: e.target.value }))
                              }
                              className="min-h-[44px]"
                            />
                          </div>
                          <div className="flex gap-2">
                            <Button
                              type="button"
                              loading={savingVisitId === visit.id}
                              onClick={() => onSaveNote(visit.id)}
                            >
                              Save
                            </Button>
                            <Button type="button" variant="secondary" onClick={cancelEdit}>
                              Cancel
                            </Button>
                          </div>
                        </div>
                      ) : (
                        <div className="space-y-4 border-t border-outline-variant/30 pt-4 text-xs">
                          <div>
                            <span className="font-bold text-on-surface uppercase text-[10px]">
                              Reason for visit
                            </span>
                            <p className="text-on-surface-variant mt-1 p-3 rounded-xl bg-surface-container-high/40 border border-outline-variant/40">
                              {visit.reason || '—'}
                            </p>
                          </div>
                          {notes && (
                            <>
                              {(notes.temperature_c != null ||
                                notes.heart_rate_bpm != null ||
                                notes.respiratory_rate != null ||
                                notes.weight_kg != null) && (
                                <div className="flex flex-wrap gap-3 p-3 rounded-xl bg-surface-container/30 border border-outline-variant/30 text-[10px]">
                                  {notes.temperature_c != null && (
                                    <span>
                                      <strong>Temp:</strong> {notes.temperature_c}°C
                                    </span>
                                  )}
                                  {notes.heart_rate_bpm != null && (
                                    <span>
                                      <strong>HR:</strong> {notes.heart_rate_bpm} bpm
                                    </span>
                                  )}
                                  {notes.respiratory_rate != null && (
                                    <span>
                                      <strong>RR:</strong> {notes.respiratory_rate}/min
                                    </span>
                                  )}
                                  {notes.weight_kg != null && (
                                    <span>
                                      <strong>Weight:</strong> {notes.weight_kg} kg
                                    </span>
                                  )}
                                </div>
                              )}
                              {notes.chief_complaint && (
                                <p>
                                  <span className="font-semibold text-on-surface">Complaint:</span>{' '}
                                  {notes.chief_complaint}
                                </p>
                              )}
                              {notes.history && (
                                <p>
                                  <span className="font-semibold text-on-surface">History:</span>{' '}
                                  {notes.history}
                                </p>
                              )}
                              {notes.examination_findings && (
                                <p>
                                  <span className="font-semibold text-on-surface">Findings:</span>{' '}
                                  {notes.examination_findings}
                                </p>
                              )}
                              {notes.diagnosis && (
                                <p className="text-emerald-400 font-semibold bg-emerald-500/10 p-2 rounded-lg border border-emerald-500/20">
                                  Diagnosis: {notes.diagnosis}
                                </p>
                              )}
                              {notes.treatment_plan && (
                                <p>
                                  <span className="font-semibold text-on-surface">Treatment:</span>{' '}
                                  {notes.treatment_plan}
                                </p>
                              )}
                              {notes.procedure_notes && (
                                <p>
                                  <span className="font-semibold text-on-surface">Procedure:</span>{' '}
                                  {notes.procedure_notes}
                                </p>
                              )}
                              {notes.post_op_medication && (
                                <p>
                                  <span className="font-semibold text-on-surface">Post-op meds:</span>{' '}
                                  {notes.post_op_medication}
                                </p>
                              )}
                              {notes.follow_up_recommendation && (
                                <p className="p-2 rounded-xl bg-surface-container-high/40 border border-outline-variant/40">
                                  <span className="font-semibold text-on-surface">Follow-up:</span>{' '}
                                  {notes.follow_up_recommendation}
                                </p>
                              )}
                            </>
                          )}
                          {visit.prescriptions && visit.prescriptions.items.length > 0 && (
                            <div className="border-t border-outline-variant/30 pt-3">
                              <div className="flex items-center gap-1.5 mb-2">
                                <Pill className="w-4 h-4 text-primary" />
                                <span className="text-[10px] font-bold uppercase">Prescription</span>
                              </div>
                              <div className="overflow-x-auto rounded-xl border border-outline-variant/40">
                                <table className="w-full text-left text-[11px]">
                                  <thead>
                                    <tr className="bg-surface-container/50 border-b border-outline-variant/40 text-[9px] font-bold uppercase">
                                      <th className="px-3 py-2">Medicine</th>
                                      <th className="px-3 py-2">Dosage</th>
                                      <th className="px-3 py-2">Frequency</th>
                                      <th className="px-3 py-2">Duration</th>
                                    </tr>
                                  </thead>
                                  <tbody className="divide-y divide-outline-variant/20">
                                    {visit.prescriptions.items.map((item, idx) => (
                                      <tr key={idx}>
                                        <td className="px-3 py-2 font-semibold">
                                          {item.medicine_name}
                                        </td>
                                        <td className="px-3 py-2">{item.dosage}</td>
                                        <td className="px-3 py-2">{item.frequency}</td>
                                        <td className="px-3 py-2">{item.duration}</td>
                                      </tr>
                                    ))}
                                  </tbody>
                                </table>
                              </div>
                            </div>
                          )}
                        </div>
                      )}

                      {visit.documents.length > 0 && (
                        <ul className="space-y-2 border-t border-outline-variant/30 pt-3">
                          {visit.documents.map((d) => (
                            <li
                              key={d.id}
                              className="flex items-center justify-between gap-2 text-xs"
                            >
                              <a
                                href={`/api/documents/${d.id}`}
                                target="_blank"
                                rel="noopener noreferrer"
                                className="text-primary hover:underline flex items-center gap-1 truncate"
                              >
                                <FileText className="w-3.5 h-3.5 shrink-0" />
                                {d.file_name}
                              </a>
                              {editable && (
                                <button
                                  type="button"
                                  onClick={() => onDeleteDoc(d.id)}
                                  disabled={deletingDoc === d.id}
                                  className="text-destructive hover:bg-destructive/10 p-1 rounded"
                                >
                                  <Trash2 className="w-3.5 h-3.5" />
                                </button>
                              )}
                            </li>
                          ))}
                        </ul>
                      )}
                    </>
                  )}
                </div>
              );
            })}
          </div>
        </div>
      )}

      {activeTab === 'labs' && (
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <FlaskConical className="w-4 h-4 text-primary" />
            Lab Reports
          </h4>
          {allLabOrders.length > 0 ? (
            <div className="divide-y divide-outline-variant/20">
              {allLabOrders.map((lab) => (
                <div key={lab.id} className="py-4 flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{lab.test_name}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {new Date(lab.created_at).toLocaleDateString()} · {lab.status}
                    </p>
                    {lab.result_text && (
                      <p className="text-xs text-on-surface-variant mt-2">{lab.result_text}</p>
                    )}
                  </div>
                  {lab.result_document_id && (
                    <a
                      href={`/api/documents/${lab.result_document_id}`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      View result <ExternalLink className="w-3 h-3" />
                    </a>
                  )}
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic">No lab orders on file.</p>
          )}
        </div>
      )}

      {activeTab === 'billing' && (
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-on-surface flex items-center gap-2">
            <Receipt className="w-4 h-4 text-primary" />
            Billing
          </h4>
          {profile.invoices.length > 0 ? (
            <div className="divide-y divide-outline-variant/20">
              {profile.invoices.map((inv) => (
                <div key={inv.id} className="py-4 flex flex-wrap justify-between gap-2 items-center">
                  <div>
                    <p className="text-sm font-semibold text-on-surface">{inv.invoice_number}</p>
                    <p className="text-[10px] text-on-surface-variant">
                      {new Date(inv.created_at).toLocaleDateString()} · {inv.payment_status}
                    </p>
                  </div>
                  <div className="flex items-center gap-3">
                    <span className="text-sm font-mono text-on-surface">
                      {formatCurrency(inv.total)}
                    </span>
                    <Link
                      href={`/dashboard/invoices/${inv.id}`}
                      className="text-xs text-primary hover:underline flex items-center gap-1"
                    >
                      Open <ChevronRight className="w-3 h-3" />
                    </Link>
                  </div>
                </div>
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant italic">No invoices on file.</p>
          )}
        </div>
      )}

      {activeTab === 'care' && (
        <div className="grid grid-cols-1 md:grid-cols-2 gap-6">
          <div className="glass-panel border-destructive/20 bg-destructive/5 rounded-xl p-6">
            <div className="flex items-center gap-2 text-destructive mb-4">
              <AlertTriangle className="w-5 h-5" />
              <h4 className="text-sm font-bold">Critical Alerts</h4>
            </div>
            {profile.allergies && profile.allergies !== 'None' ? (
              <div className="p-3 bg-destructive/10 border-l-4 border-destructive rounded-r-lg">
                <p className="text-[10px] font-bold text-destructive uppercase">Allergy</p>
                <p className="text-sm text-on-surface mt-1">{profile.allergies}</p>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant">No known allergies recorded.</p>
            )}
          </div>

          <div className="glass-panel rounded-xl p-6 space-y-4">
            <div className="flex justify-between items-center">
              <h4 className="text-sm font-bold text-on-surface">Care & diet notes</h4>
              {canEditCareNotes && !editingCare && (
                <button
                  type="button"
                  onClick={() => setEditingCare(true)}
                  className="text-[10px] font-semibold text-primary flex items-center gap-1"
                >
                  <Pencil className="w-3 h-3" /> Edit
                </button>
              )}
            </div>
            {editingCare ? (
              <div className="space-y-3">
                <Textarea
                  label="Allergies"
                  value={careForm.allergies}
                  onChange={(e) => setCareForm((f) => ({ ...f, allergies: e.target.value }))}
                />
                <Textarea
                  label="Medical / care / diet notes"
                  value={careForm.medicalNotes}
                  onChange={(e) => setCareForm((f) => ({ ...f, medicalNotes: e.target.value }))}
                />
                <Textarea
                  label="Weight (kg)"
                  value={careForm.weightKg}
                  onChange={(e) => setCareForm((f) => ({ ...f, weightKg: e.target.value }))}
                  className="min-h-[44px]"
                />
                <div className="flex gap-2">
                  <Button type="button" loading={savingCare} onClick={onSaveCare}>
                    Save
                  </Button>
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setEditingCare(false);
                      setCareForm({
                        allergies: profile.allergies || '',
                        medicalNotes: profile.medicalNotes || '',
                        weightKg: profile.weightKg?.toString() ?? '',
                      });
                    }}
                  >
                    Cancel
                  </Button>
                </div>
              </div>
            ) : (
              <p className="text-xs text-on-surface-variant whitespace-pre-line leading-relaxed">
                {profile.medicalNotes || 'No special care notes recorded.'}
              </p>
            )}
          </div>
        </div>
      )}

      {activeTab === 'recommendations' && (
        <div className="glass-panel rounded-xl p-6 space-y-4">
          <h4 className="text-sm font-bold text-on-surface">Follow-up recommendations</h4>
          {recommendations.length > 0 ? (
            <ul className="space-y-4">
              {recommendations.map((rec) => (
                <li
                  key={rec.visitId}
                  className="p-4 rounded-xl border border-outline-variant/30 bg-surface-container/20"
                >
                  <p className="text-[10px] font-bold text-primary-container mb-1">
                    {rec.date ? new Date(rec.date).toLocaleDateString() : 'Visit'}
                    {rec.days?.length ? ` · ${rec.days.join(', ')} days` : ''}
                  </p>
                  <p className="text-sm text-on-surface">{rec.text}</p>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-xs text-on-surface-variant italic">No follow-up recommendations.</p>
          )}
        </div>
      )}
    </div>
  );
}
