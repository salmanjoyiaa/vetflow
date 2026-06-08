'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import { uploadVisitDocumentAction, deleteDocumentAction } from '@/lib/services/document-actions';
import Button from '@/components/ui/premium/Button';
import Select from '@/components/ui/premium/Select';
import { ArrowLeft, FileText, Upload, Trash2, ExternalLink } from 'lucide-react';

export type DoctorVisitRow = {
  id: string;
  reason: string | null;
  status: string;
  checked_in_at: string | null;
  doctorName: string | null;
  notes: {
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
}

export default function DoctorPatientHistoryClient({
  petId,
  petName,
  species,
  breed,
  allergies,
  ownerName,
  visits,
}: DoctorPatientHistoryClientProps) {
  const router = useRouter();
  const fileRef = useRef<HTMLInputElement>(null);
  const [uploadVisitId, setUploadVisitId] = useState(visits[0]?.id ?? '');
  const [uploading, setUploading] = useState(false);
  const [deleting, setDeleting] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);

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
    if (res.success) router.refresh();
    else setError(res.error || 'Upload failed');
  };

  const onDelete = async (docId: string) => {
    setDeleting(docId);
    const res = await deleteDocumentAction(docId);
    setDeleting(null);
    if (res.success) router.refresh();
    else setError(res.error || 'Delete failed');
  };

  return (
    <div className="space-y-8">
      <Link
        href="/dashboard/doctors"
        className="inline-flex items-center gap-1.5 text-xs text-on-surface-variant hover:text-primary font-semibold"
      >
        <ArrowLeft className="w-4 h-4" />
        Back to doctor queue
      </Link>

      <div className="grid md:grid-cols-3 gap-6">
        <div className="glass-panel p-6 space-y-4 md:col-span-1">
          <h2 className="text-lg font-bold text-on-surface">{petName}</h2>
          <p className="text-xs text-on-surface-variant capitalize">{species}{breed ? ` · ${breed}` : ''}</p>
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
                <input ref={fileRef} type="file" className="hidden" accept=".pdf,image/*" onChange={onUpload} disabled={uploading} />
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

          {visits.map((visit) => (
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
                <Link
                  href={`/dashboard/doctors/${visit.id}`}
                  className="text-[10px] font-semibold text-primary flex items-center gap-1 hover:underline"
                >
                  Open consultation <ExternalLink className="w-3 h-3" />
                </Link>
              </div>

              {visit.notes && (
                <div className="text-xs text-on-surface-variant space-y-1 border-t border-outline-variant/30 pt-3">
                  {visit.notes.chief_complaint && <p><span className="font-semibold text-on-surface">Complaint:</span> {visit.notes.chief_complaint}</p>}
                  {visit.notes.diagnosis && <p><span className="font-semibold text-on-surface">Diagnosis:</span> {visit.notes.diagnosis}</p>}
                  {visit.notes.treatment_plan && <p><span className="font-semibold text-on-surface">Treatment:</span> {visit.notes.treatment_plan}</p>}
                </div>
              )}

              {visit.documents.length > 0 && (
                <ul className="space-y-2 border-t border-outline-variant/30 pt-3">
                  {visit.documents.map((d) => (
                    <li key={d.id} className="flex items-center justify-between gap-2 text-xs">
                      <a href={`/api/documents/${d.id}`} target="_blank" rel="noopener noreferrer" className="text-primary hover:underline flex items-center gap-1 truncate">
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
          ))}
        </div>
      </div>
    </div>
  );
}
