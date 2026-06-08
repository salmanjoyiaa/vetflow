'use client';

import { useRef, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  FlaskConical,
  FileUp,
  Plus,
  Loader2,
  Download,
  Trash2,
  Paperclip,
} from 'lucide-react';
import { createLabOrderAction, updateLabOrderResultAction } from '@/lib/services/lab-actions';
import {
  uploadVisitDocumentAction,
  deleteDocumentAction,
} from '@/lib/services/document-actions';

interface LabCatalogItem {
  id: string;
  name: string;
}
interface LabOrder {
  id: string;
  testName: string;
  status: string;
  resultText: string | null;
  resultDocumentId: string | null;
  createdAt: string;
}
interface DocumentItem {
  id: string;
  fileName: string;
  category: string;
  mimeType: string | null;
  sizeBytes: number | null;
  createdAt: string;
}

interface Props {
  visitId: string;
  patientId: string;
  labCatalog: LabCatalogItem[];
  labOrders: LabOrder[];
  documents: DocumentItem[];
}

const DOC_CATEGORIES = ['lab_result', 'imaging', 'consent', 'referral', 'other'] as const;

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

export default function ConsultationLabsDocsPanel({
  visitId,
  patientId,
  labCatalog,
  labOrders,
  documents,
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);

  // --- lab order form state ---
  const [testName, setTestName] = useState('');
  const [labTestId, setLabTestId] = useState('');
  const [labNotes, setLabNotes] = useState('');
  const [orderingLab, setOrderingLab] = useState(false);

  // --- upload state ---
  const fileRef = useRef<HTMLInputElement>(null);
  const [docCategory, setDocCategory] = useState<string>('lab_result');
  const [docDescription, setDocDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const onSelectCatalog = (id: string) => {
    setLabTestId(id);
    const found = labCatalog.find((l) => l.id === id);
    if (found) setTestName(found.name);
  };

  const submitLabOrder = async () => {
    if (!testName.trim()) {
      setError('Enter a test name to order a lab.');
      return;
    }
    setOrderingLab(true);
    setError(null);
    try {
      const res = await createLabOrderAction({
        visitId,
        labTestId: labTestId || null,
        testName: testName.trim(),
        notes: labNotes,
      });
      if (res.success) {
        setTestName('');
        setLabTestId('');
        setLabNotes('');
        router.refresh();
      } else {
        setError(res.error || 'Failed to order lab.');
      }
    } finally {
      setOrderingLab(false);
    }
  };

  const changeLabStatus = async (order: LabOrder, status: string) => {
    setError(null);
    const res = await updateLabOrderResultAction({
      labOrderId: order.id,
      status,
      resultText: order.resultText || '',
      resultDocumentId: order.resultDocumentId || null,
    });
    if (res.success) router.refresh();
    else setError(res.error || 'Failed to update lab.');
  };

  const submitUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('visitId', visitId);
      fd.append('patientId', patientId);
      fd.append('category', docCategory);
      fd.append('description', docDescription);
      const res = await uploadVisitDocumentAction(fd);
      if (res.success) {
        if (fileRef.current) fileRef.current.value = '';
        setDocDescription('');
        router.refresh();
      } else {
        setError(res.error || 'Upload failed.');
      }
    } finally {
      setUploading(false);
    }
  };

  const removeDoc = async (id: string) => {
    setError(null);
    const res = await deleteDocumentAction(id);
    if (res.success) router.refresh();
    else setError(res.error || 'Delete failed.');
  };

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}

      {/* LAB ORDERS */}
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/30 pb-4">
          <FlaskConical className="w-4 h-4 text-primary" />
          Lab tests
        </h3>

        <div className="grid sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
              From catalog
            </label>
            <select
              value={labTestId}
              onChange={(e) => onSelectCatalog(e.target.value)}
              className="w-full px-2 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] font-bold text-on-surface outline-none"
            >
              <option value="">-- Custom --</option>
              {labCatalog.map((l) => (
                <option key={l.id} value={l.id}>
                  {l.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-4">
            <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
              Test name
            </label>
            <input
              value={testName}
              onChange={(e) => setTestName(e.target.value)}
              placeholder="e.g. CBC, Urinalysis"
              className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] text-on-surface outline-none"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
              Notes
            </label>
            <input
              value={labNotes}
              onChange={(e) => setLabNotes(e.target.value)}
              placeholder="optional"
              className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] text-on-surface outline-none"
            />
          </div>
          <div className="sm:col-span-1">
            <button
              type="button"
              onClick={submitLabOrder}
              disabled={orderingLab}
              className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-bold text-white bg-primary px-2 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
            >
              {orderingLab ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <Plus className="w-3.5 h-3.5" />}
            </button>
          </div>
        </div>

        {labOrders.length > 0 ? (
          <div className="space-y-2">
            {labOrders.map((o) => (
              <div
                key={o.id}
                className="flex items-center justify-between gap-3 p-3 bg-surface-container/20 border border-outline-variant/40 rounded-xl"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{o.testName}</p>
                  {o.resultText && (
                    <p className="text-[10px] text-on-surface-variant/60 truncate">{o.resultText}</p>
                  )}
                </div>
                <select
                  value={o.status}
                  onChange={(e) => changeLabStatus(o, e.target.value)}
                  className="px-2 py-1 glass-panel border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface outline-none capitalize"
                >
                  <option value="ordered">Ordered</option>
                  <option value="in_progress">In progress</option>
                  <option value="completed">Completed</option>
                  <option value="cancelled">Cancelled</option>
                </select>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant/50 italic text-center py-3">
            No lab tests ordered for this visit.
          </p>
        )}
      </div>

      {/* DOCUMENTS */}
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-4">
        <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-1.5 border-b border-outline-variant/30 pb-4">
          <Paperclip className="w-4 h-4 text-primary" />
          Medical documents
        </h3>

        <div className="grid sm:grid-cols-12 gap-3 items-end">
          <div className="sm:col-span-4">
            <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
              File (PDF/image, max 15MB)
            </label>
            <input
              ref={fileRef}
              type="file"
              accept=".pdf,image/png,image/jpeg,image/webp,image/heic,text/plain"
              className="w-full text-[10px] text-on-surface file:mr-2 file:py-1.5 file:px-2 file:rounded-lg file:border-0 file:bg-primary/10 file:text-primary file:font-bold"
            />
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
              Category
            </label>
            <select
              value={docCategory}
              onChange={(e) => setDocCategory(e.target.value)}
              className="w-full px-2 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] font-bold text-on-surface outline-none capitalize"
            >
              {DOC_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {c.replace('_', ' ')}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-3">
            <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
              Description
            </label>
            <input
              value={docDescription}
              onChange={(e) => setDocDescription(e.target.value)}
              placeholder="optional"
              className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] text-on-surface outline-none"
            />
          </div>
          <div className="sm:col-span-2">
            <button
              type="button"
              onClick={submitUpload}
              disabled={uploading}
              className="w-full inline-flex items-center justify-center gap-1 text-[10px] font-bold text-white bg-primary px-2 py-2 rounded-lg hover:opacity-90 transition-all disabled:opacity-60"
            >
              {uploading ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : <FileUp className="w-3.5 h-3.5" />}
              Upload
            </button>
          </div>
        </div>

        {documents.length > 0 ? (
          <div className="space-y-2">
            {documents.map((d) => (
              <div
                key={d.id}
                className="flex items-center justify-between gap-3 p-3 bg-surface-container/20 border border-outline-variant/40 rounded-xl"
              >
                <div className="min-w-0">
                  <p className="text-xs font-bold text-on-surface truncate">{d.fileName}</p>
                  <p className="text-[10px] text-on-surface-variant/50">
                    <span className="capitalize">{d.category.replace('_', ' ')}</span>
                    {d.sizeBytes ? ` · ${formatBytes(d.sizeBytes)}` : ''}
                  </p>
                </div>
                <div className="flex items-center gap-1.5">
                  <a
                    href={`/api/documents/${d.id}`}
                    className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all"
                    title="Download"
                  >
                    <Download className="w-4 h-4" />
                  </a>
                  <button
                    type="button"
                    onClick={() => removeDoc(d.id)}
                    className="text-destructive hover:bg-destructive/5 p-1.5 rounded-lg transition-all"
                    title="Delete"
                  >
                    <Trash2 className="w-4 h-4" />
                  </button>
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant/50 italic text-center py-3">
            No documents uploaded for this visit.
          </p>
        )}
      </div>
    </div>
  );
}
