'use client';

import { useRef, useState, useEffect } from 'react';
import { useRouter } from 'next/navigation';
import {
  FlaskConical,
  FileUp,
  Plus,
  Loader2,
  Download,
  Trash2,
  Paperclip,
  Pencil,
  X,
  Check,
} from 'lucide-react';
import { createLabOrderAction, updateLabOrderResultAction } from '@/lib/services/lab-actions';
import {
  uploadVisitDocumentAction,
  deleteDocumentAction,
  updateDocumentAction,
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
  description?: string | null;
}

interface Props {
  visitId: string;
  patientId: string;
  labCatalog: LabCatalogItem[];
  labOrders: LabOrder[];
  documents: DocumentItem[];
  previousDocuments?: DocumentItem[];
}

const DOC_CATEGORIES = [
  'lab_result',
  'imaging',
  'xray',
  'prescription',
  'discharge',
  'vaccine',
  'consent',
  'referral',
  'other',
] as const;

function formatBytes(bytes: number | null): string {
  if (!bytes) return '';
  if (bytes < 1024) return `${bytes} B`;
  if (bytes < 1024 * 1024) return `${(bytes / 1024).toFixed(0)} KB`;
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

function categoryLabel(c: string): string {
  return c.replace(/_/g, ' ');
}

function DocumentRow({
  doc,
  editable,
  onDelete,
}: {
  doc: DocumentItem;
  editable: boolean;
  onDelete: (id: string) => void;
}) {
  const router = useRouter();
  const [editing, setEditing] = useState(false);
  const [saving, setSaving] = useState(false);
  const [editError, setEditError] = useState<string | null>(null);
  const [fileName, setFileName] = useState(doc.fileName);
  const [category, setCategory] = useState(doc.category);
  const [description, setDescription] = useState(doc.description || '');

  const saveEdit = async () => {
    setSaving(true);
    setEditError(null);
    const res = await updateDocumentAction({
      documentId: doc.id,
      fileName: fileName.trim(),
      category,
      description,
    });
    setSaving(false);
    if (res.success) {
      setEditing(false);
      router.refresh();
    } else {
      setEditError(res.error || 'Failed to save.');
    }
  };

  return (
    <div className="p-3 bg-surface-container/20 border border-outline-variant/40 rounded-xl space-y-2">
      {editing ? (
        <div className="space-y-2">
          <input
            value={fileName}
            onChange={(e) => setFileName(e.target.value)}
            className="w-full px-2 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] text-on-surface outline-none"
            placeholder="File title"
          />
          <select
            value={category}
            onChange={(e) => setCategory(e.target.value)}
            className="w-full px-2 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] font-bold text-on-surface outline-none capitalize"
          >
            {DOC_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {categoryLabel(c)}
              </option>
            ))}
          </select>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Notes"
            className="w-full px-2 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] text-on-surface outline-none"
          />
          {editError && <p className="text-[10px] text-destructive">{editError}</p>}
          <div className="flex gap-2">
            <button
              type="button"
              onClick={saveEdit}
              disabled={saving}
              className="inline-flex items-center gap-1 text-[10px] font-bold text-white bg-primary px-2 py-1 rounded-lg disabled:opacity-60"
            >
              {saving ? <Loader2 className="w-3 h-3 animate-spin" /> : <Check className="w-3 h-3" />}
              Save
            </button>
            <button
              type="button"
              onClick={() => {
                setEditing(false);
                setFileName(doc.fileName);
                setCategory(doc.category);
                setDescription(doc.description || '');
                setEditError(null);
              }}
              className="text-[10px] font-bold text-on-surface-variant"
            >
              Cancel
            </button>
          </div>
        </div>
      ) : (
        <div className="flex items-center justify-between gap-3">
          <div className="min-w-0">
            <p className="text-xs font-bold text-on-surface truncate">{doc.fileName}</p>
            <p className="text-[10px] text-on-surface-variant/50">
              <span className="capitalize">{categoryLabel(doc.category)}</span>
              {doc.sizeBytes ? ` · ${formatBytes(doc.sizeBytes)}` : ''}
              {doc.description ? ` · ${doc.description}` : ''}
            </p>
          </div>
          <div className="flex items-center gap-1.5 shrink-0">
            {editable && (
              <button
                type="button"
                onClick={() => setEditing(true)}
                className="text-on-surface-variant hover:bg-surface-container p-1.5 rounded-lg transition-all"
                title="Edit details"
              >
                <Pencil className="w-4 h-4" />
              </button>
            )}
            <a
              href={`/api/documents/${doc.id}`}
              target="_blank"
              rel="noopener noreferrer"
              className="text-primary hover:bg-primary/10 p-1.5 rounded-lg transition-all"
              title="View / download"
            >
              <Download className="w-4 h-4" />
            </a>
            {editable && (
              <button
                type="button"
                onClick={() => onDelete(doc.id)}
                className="text-destructive hover:bg-destructive/5 p-1.5 rounded-lg transition-all"
                title="Delete"
              >
                <Trash2 className="w-4 h-4" />
              </button>
            )}
          </div>
        </div>
      )}
    </div>
  );
}

export default function ConsultationLabsDocsPanel({
  visitId,
  patientId,
  labCatalog,
  labOrders,
  documents: initialDocuments,
  previousDocuments = [],
}: Props) {
  const router = useRouter();
  const [error, setError] = useState<string | null>(null);
  const [uploadSuccess, setUploadSuccess] = useState(false);
  const [localDocuments, setLocalDocuments] = useState(initialDocuments);

  useEffect(() => {
    setLocalDocuments(initialDocuments);
  }, [initialDocuments]);

  const [testName, setTestName] = useState('');
  const [labTestId, setLabTestId] = useState('');
  const [labNotes, setLabNotes] = useState('');
  const [orderingLab, setOrderingLab] = useState(false);
  const [savingLabId, setSavingLabId] = useState<string | null>(null);

  const fileRef = useRef<HTMLInputElement>(null);
  const [docCategory, setDocCategory] = useState<string>('lab_result');
  const [docDescription, setDocDescription] = useState('');
  const [uploading, setUploading] = useState(false);

  const onSelectCatalog = (id: string) => {
    setLabTestId(id);
    const found = labCatalog.find((l) => l.id === id);
    if (found) setTestName(found.name);
    else setTestName('');
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

  const [resultDrafts, setResultDrafts] = useState<Record<string, string>>({});

  const getResultDraft = (order: LabOrder) =>
    resultDrafts[order.id] ?? order.resultText ?? '';

  const saveLabResult = async (order: LabOrder) => {
    setSavingLabId(order.id);
    setError(null);
    const resultText = getResultDraft(order);
    const status =
      order.status === 'completed'
        ? 'completed'
        : resultText.trim()
          ? 'in_progress'
          : order.status;
    try {
      const res = await updateLabOrderResultAction({
        labOrderId: order.id,
        status,
        resultText,
        resultDocumentId: order.resultDocumentId || null,
      });
      if (res.success) router.refresh();
      else setError(res.error || 'Failed to save result.');
    } finally {
      setSavingLabId(null);
    }
  };

  const changeLabStatus = async (order: LabOrder, status: string) => {
    setSavingLabId(order.id);
    setError(null);
    try {
      const res = await updateLabOrderResultAction({
        labOrderId: order.id,
        status,
        resultText: order.resultText || '',
        resultDocumentId: order.resultDocumentId || null,
      });
      if (res.success) router.refresh();
      else setError(res.error || 'Failed to update lab.');
    } finally {
      setSavingLabId(null);
    }
  };

  const submitUpload = async () => {
    const file = fileRef.current?.files?.[0];
    if (!file) {
      setError('Choose a file to upload.');
      return;
    }
    setUploading(true);
    setError(null);
    setUploadSuccess(false);
    try {
      const fd = new FormData();
      fd.append('file', file);
      fd.append('visitId', visitId);
      fd.append('patientId', patientId);
      fd.append('category', docCategory);
      fd.append('description', docDescription);
      const res = await uploadVisitDocumentAction(fd);
      if (res.success && res.document) {
        if (fileRef.current) fileRef.current.value = '';
        setDocDescription('');
        setUploadSuccess(true);
        setLocalDocuments((prev) => [
          {
            id: res.document.id,
            fileName: res.document.fileName,
            category: res.document.category,
            mimeType: res.document.mimeType,
            sizeBytes: res.document.sizeBytes,
            createdAt: res.document.createdAt,
            description: res.document.description ?? null,
          },
          ...prev,
        ]);
        setTimeout(() => setUploadSuccess(false), 3000);
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
    if (res.success) {
      setLocalDocuments((prev) => prev.filter((d) => d.id !== id));
      router.refresh();
    } else {
      setError(res.error || 'Delete failed.');
    }
  };

  const displayDocuments = localDocuments.length >= initialDocuments.length ? localDocuments : initialDocuments;

  return (
    <div className="space-y-6">
      {error && (
        <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
          {error}
        </div>
      )}
      {uploadSuccess && (
        <div className="p-3 bg-primary/5 border border-primary/20 text-primary text-xs rounded-xl">
          File uploaded successfully.
        </div>
      )}

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
          <div className="space-y-3">
            {labOrders.map((o) => (
              <div
                key={o.id}
                className="p-4 bg-surface-container/20 border border-outline-variant/40 rounded-xl space-y-3"
              >
                <div className="flex items-center justify-between gap-3">
                  <div className="min-w-0">
                    <p className="text-xs font-bold text-on-surface truncate">{o.testName}</p>
                    <p className="text-[10px] text-on-surface-variant/60 capitalize">{o.status.replace('_', ' ')}</p>
                  </div>
                  <select
                    value={o.status}
                    disabled={savingLabId === o.id}
                    onChange={(e) => changeLabStatus(o, e.target.value)}
                    className="px-2 py-1 glass-panel border border-outline-variant rounded-lg text-[10px] font-bold text-on-surface outline-none capitalize disabled:opacity-60"
                  >
                    <option value="ordered">Demanded</option>
                    <option value="in_progress">Uploaded</option>
                    <option value="completed">Completed</option>
                    <option value="cancelled">Cancelled</option>
                  </select>
                </div>
                <div>
                  <label className="block text-[9px] font-bold text-on-surface-variant/40 uppercase mb-1">
                    Result text
                  </label>
                  <textarea
                    value={getResultDraft(o)}
                    onChange={(e) =>
                      setResultDrafts((prev) => ({ ...prev, [o.id]: e.target.value }))
                    }
                    rows={3}
                    placeholder="Enter lab result findings..."
                    className="w-full px-2.5 py-1.5 glass-panel border border-outline-variant rounded-lg text-[11px] text-on-surface outline-none"
                  />
                </div>
                <div className="flex items-center gap-2 flex-wrap">
                  <button
                    type="button"
                    onClick={() => saveLabResult(o)}
                    disabled={savingLabId === o.id}
                    className="text-[10px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg inline-flex items-center gap-1 disabled:opacity-60"
                  >
                    {savingLabId === o.id ? (
                      <Loader2 className="w-3 h-3 animate-spin" />
                    ) : null}
                    Save result
                  </button>
                  {o.status === 'completed' && (
                    <a
                      href={`/api/lab-orders/${o.id}/pdf`}
                      target="_blank"
                      rel="noopener noreferrer"
                      className="text-[10px] font-bold text-primary border border-primary/20 px-3 py-1.5 rounded-lg"
                    >
                      Download report
                    </a>
                  )}
                </div>
              </div>
            ))}
          </div>
        ) : (
          <p className="text-xs text-on-surface-variant/50 italic text-center py-3">
            No lab tests ordered for this visit.
          </p>
        )}
      </div>

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
              accept=".pdf,.png,.jpg,.jpeg,.webp,.heic,.txt,image/*,application/pdf,text/plain"
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
                  {categoryLabel(c)}
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
              {uploading ? (
                <>
                  <Loader2 className="w-3.5 h-3.5 animate-spin" />
                  Uploading…
                </>
              ) : (
                <>
                  <FileUp className="w-3.5 h-3.5" />
                  Upload
                </>
              )}
            </button>
          </div>
        </div>

        <div className="space-y-3">
          <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
            Current consultation files
          </p>
          {displayDocuments.length > 0 ? (
            <div className="space-y-2">
              {displayDocuments.map((d) => (
                <DocumentRow key={d.id} doc={d} editable onDelete={removeDoc} />
              ))}
            </div>
          ) : (
            <p className="text-xs text-on-surface-variant/50 italic text-center py-3">
              No documents uploaded for this visit.
            </p>
          )}
        </div>

        {previousDocuments.length > 0 && (
          <div className="space-y-3 pt-2 border-t border-outline-variant/30">
            <p className="text-[10px] font-bold text-on-surface-variant uppercase tracking-wider">
              Previous medical files
            </p>
            <div className="space-y-2">
              {previousDocuments.map((d) => (
                <DocumentRow key={d.id} doc={d} editable={false} onDelete={removeDoc} />
              ))}
            </div>
          </div>
        )}
      </div>
    </div>
  );
}
