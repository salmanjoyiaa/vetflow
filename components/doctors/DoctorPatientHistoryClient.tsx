'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { uploadVisitDocumentAction, deleteDocumentAction } from '@/lib/services/document-actions';
import { updateClinicalNoteAction } from '@/lib/services/patient-medical-actions';
import Button from '@/components/ui/premium/Button';
import Select from '@/components/ui/premium/Select';
import Textarea from '@/components/ui/premium/Textarea';
import { ArrowLeft, FileText, Upload, Trash2, ExternalLink, Pencil } from 'lucide-react';

export type DoctorVisitRow = {
  id: string;
  reason: string | null;
  status: string;
  checked_in_at: string | null;
  doctorName: string | null;
  notes: {
    id: string;
    diagnosis: string | null;
    treatment_plan: string | null;
    chief_complaint: string | null;
  } | null;
  documents: Array<{
    id: string;
    file_name: string;
    category: string;
    created_at: string;
  }>;
};

interface DoctorPatientHistoryClientProps {
  petId: string;
  petName: string;
  species: string;
  breed: string | null;
  allergies: string | null;
  ownerName: string | null;
  visits: DoctorVisitRow[];
  variant?: 'page' | 'panel';
  editable?: boolean;
  onRefresh?: () => void;
}

export default function DoctorPatientHistoryClient({
  petId,
  petName,
  species,
  breed,
  allergies,
  ownerName,
  visits,
  variant = 'page',
  editable = false,
  onRefresh,
}: DoctorPatientHistoryClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadVisitId, setUploadVisitId] = useState(visits[0]?.id ?? '');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [editingVisitId, setEditingVisitId] = useState<string | null>(null);
  const [savingVisitId, setSavingVisitId] = useState<string | null>(null);
  const [editForm, setEditForm] = useState({
    chiefComplaint: '',
    diagnosis: '',
    treatmentPlan: '',
  });

  const refresh = () => {
    if (onRefresh) onRefresh();
    else router.refresh();
  };

  const visitOptions = visits.map((v) => ({
    value: v.id,
    label: `${new Date(v.checked_in_at || '').toLocaleDateString()} — ${v.reason || 'Visit'} (${v.status})`,
  }));

  const onUpload = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file || !uploadVisitId) return;
    setUploading(true);
    setError(null);
    const fd = new FormData();
    fd.append('file', file);
    fd.append('visitId', uploadVisitId);
    fd.append('patientId', petId);
    fd.append('category', 'medical_record');
    const res = await uploadVisitDocumentAction(fd);
    setUploading(false);
    e.target.value = '';
    if (res.success) refresh();
    else setError(res.error || 'Upload failed');
  };

  const onDelete = async (docId: string) => {
    setDeleting(docId);
    const res = await deleteDocumentAction(docId);
    setDeleting(null);
    if (res.success) refresh();
    else setError(res.error || 'Delete failed');
  };

  const startEdit = (visit: DoctorVisitRow) => {
    setEditingVisitId(visit.id);
    setEditForm({
      chiefComplaint: visit.notes?.chief_complaint || visit.reason || '',
      diagnosis: visit.notes?.diagnosis || '',
      treatmentPlan: visit.notes?.treatment_plan || '',
    });
    setError(null);
  };

  const cancelEdit = () => {
    setEditingVisitId(null);
    setError(null);
  };

  const onSaveNote = async (visitId: string) => {
    setSavingVisitId(visitId);
    setError(null);
    const res = await updateClinicalNoteAction({
      visitId,
      chiefComplaint: editForm.chiefComplaint.trim(),
      diagnosis: editForm.diagnosis.trim(),
      treatmentPlan: editForm.treatmentPlan.trim(),
    });
    setSavingVisitId(null);
    if (res.success) {
      setEditingVisitId(null);
      refresh();
    } else {
      setError(res.error || 'Failed to save clinical notes');
    }
  };

  return (
    <div className="space-y-8">
      {variant === 'page' && (
        <Link
          href="/dashboard/doctors"
          className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary font-semibold"
        >
          <ArrowLeft className="w-4 h-4" />
          Back to doctor queue
        </Link>
      )}

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 space-y-4 md:col-span-1">
          <h2 className="text-lg font-bold text-on-surface">{petName}</h2>
          <p className="text-xs text-on-surface-variant capitalize">
            {species}
            {breed ? ` · ${breed}` : ''}
          </p>
          {ownerName && <p className="text-xs text-on-surface-variant">Owner: {ownerName}</p>}
          {allergies && allergies !== 'None' && (
            <p className="text-xs text-destructive font-semibold">Allergies: {allergies}</p>
          )}
        </div>

        <div className="md:col-span-2 space-y-4">
          <div className="glass-panel p-4 space-y-3">
            <h3 className="text-sm font-bold text-on-surface">Upload medical file</h3>
            {visitOptions.length > 0 ? (
              <>
                <Select
                  label="Link to visit"
                  value={uploadVisitId}
                  onChange={setUploadVisitId}
                  options={visitOptions}
                />
                <input
                  ref={fileRef}
                  type="file"
                  className="hidden"
                  accept=".pdf,image/*"
                  onChange={onUpload}
                  disabled={uploading}
                />
                <Button
                  type="button"
                  variant="secondary"
                  loading={uploading}
                  icon={<Upload className="w-4 h-4" />}
                  onClick={() => fileRef.current?.click()}
                >
                  Upload document
                </Button>
              </>
            ) : (
              <p className="text-xs text-on-surface-variant">No visits yet for this patient.</p>
            )}
            {error && <p className="text-xs text-destructive">{error}</p>}
          </div>

          <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider">
            Visit history ({visits.length})
          </h3>

          {visits.map((visit) => {
            const isEditing = editingVisitId === visit.id;
            return (
              <div key={visit.id} className="glass-panel p-5 space-y-3">
                <div className="flex flex-wrap justify-between gap-2">
                  <div>
                    <p className="text-xs font-bold text-on-surface">
                      {visit.checked_in_at
                        ? new Date(visit.checked_in_at).toLocaleString()
                        : 'Unknown date'}
                    </p>
                    <p className="text-[10px] text-on-surface-variant mt-0.5">
                      {visit.reason || 'No reason'} · {visit.status}
                      {visit.doctorName ? ` · ${visit.doctorName}` : ''}
                    </p>
                  </div>
                  <div className="flex items-center gap-2">
                    {editable && !isEditing && (
                      <button
                        type="button"
                        onClick={() => startEdit(visit)}
                        className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline"
                      >
                        <Pencil className="w-3 h-3" />
                        Edit notes
                      </button>
                    )}
                    {variant === 'page' && (
                      <Link
                        href={`/dashboard/doctors/${visit.id}`}
                        className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline"
                      >
                        Open consultation <ExternalLink className="w-3 h-3" />
                      </Link>
                    )}
                  </div>
                </div>

                {isEditing ? (
                  <div className="space-y-3 border-t border-outline-variant/30 pt-3">
                    <Textarea
                      label="Complaint"
                      value={editForm.chiefComplaint}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, chiefComplaint: e.target.value }))
                      }
                    />
                    <Textarea
                      label="Diagnosis"
                      value={editForm.diagnosis}
                      onChange={(e) => setEditForm((f) => ({ ...f, diagnosis: e.target.value }))}
                    />
                    <Textarea
                      label="Treatment"
                      value={editForm.treatmentPlan}
                      onChange={(e) =>
                        setEditForm((f) => ({ ...f, treatmentPlan: e.target.value }))
                      }
                    />
                    <div className="flex items-center gap-2">
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
                  (visit.notes?.chief_complaint ||
                    visit.notes?.diagnosis ||
                    visit.notes?.treatment_plan) && (
                    <div className="text-xs text-on-surface-variant space-y-1 border-t border-outline-variant/30 pt-3">
                      {visit.notes.chief_complaint && (
                        <p>
                          <span className="font-semibold text-on-surface">Complaint:</span>{' '}
                          {visit.notes.chief_complaint}
                        </p>
                      )}
                      {visit.notes.diagnosis && (
                        <p>
                          <span className="font-semibold text-on-surface">Diagnosis:</span>{' '}
                          {visit.notes.diagnosis}
                        </p>
                      )}
                      {visit.notes.treatment_plan && (
                        <p>
                          <span className="font-semibold text-on-surface">Treatment:</span>{' '}
                          {visit.notes.treatment_plan}
                        </p>
                      )}
                    </div>
                  )
                )}

                {visit.documents.length > 0 && (
                  <ul className="space-y-2 border-t border-outline-variant/30 pt-3">
                    {visit.documents.map((d) => (
                      <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                        <a
                          href={`/api/documents/${d.id}`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="text-primary hover:underline flex items-center gap-1 truncate"
                        >
                          <FileText className="w-3.5 h-3.5 shrink-0" />
                          {d.file_name}
                        </a>
                        <button
                          type="button"
                          onClick={() => onDelete(d.id)}
                          disabled={deleting === d.id}
                          className="text-destructive hover:bg-destructive/10 p-1 rounded"
                          title="Delete"
                        >
                          <Trash2 className="w-3.5 h-3.5" />
                        </button>
                      </li>
                    ))}
                  </ul>
                )}
              </div>
            );
          })}
        </div>
      </div>
    </div>
  );
}
