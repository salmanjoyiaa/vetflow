'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import { deleteDocumentAction } from '@/lib/services/document-actions';
import { FileText, Trash2, Loader2, ExternalLink } from 'lucide-react';

export type PatientDocumentRow = {
  id: string;
  file_name: string;
  category: string;
  created_at: string;
  mime_type: string | null;
  storage_path: string;
};

interface PatientDocumentsClientProps {
  documents: PatientDocumentRow[];
  canDelete: boolean;
}

export default function PatientDocumentsClient({
  documents,
  canDelete,
}: PatientDocumentsClientProps) {
  const [deletingId, setDeletingId] = useState<string | null>(null);
  const router = useRouter();

  if (documents.length === 0) return null;

  const handleDelete = async (id: string, name: string) => {
    if (!confirm(`Delete "${name}"?`)) return;
    setDeletingId(id);
    try {
      const res = await deleteDocumentAction(id);
      if (res.success) router.refresh();
      else alert(res.error || 'Delete failed');
    } finally {
      setDeletingId(null);
    }
  };

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-4">
      <h3 className="text-sm font-bold text-on-surface uppercase tracking-wider flex items-center gap-2 border-b border-outline-variant/30 pb-4">
        <FileText className="w-4 h-4 text-primary" />
        Patient files
      </h3>
      <ul className="divide-y divide-outline-variant/20">
        {documents.map((doc) => (
          <li key={doc.id} className="py-3 flex items-center justify-between gap-3">
            <div className="min-w-0">
              <span className="text-xs font-bold text-on-surface block truncate">{doc.file_name}</span>
              <span className="text-[10px] text-on-surface-variant capitalize">
                {doc.category.replace('_', ' ')} · {new Date(doc.created_at).toLocaleDateString()}
              </span>
            </div>
            <div className="flex items-center gap-2 shrink-0">
              <a
                href={`/api/documents/${doc.id}`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] font-bold text-primary inline-flex items-center gap-1 hover:underline"
              >
                View
                <ExternalLink className="w-3 h-3" />
              </a>
              {canDelete && (
                <button
                  type="button"
                  disabled={deletingId !== null}
                  onClick={() => handleDelete(doc.id, doc.file_name)}
                  className="inline-flex items-center gap-1 px-2 py-1 rounded-lg text-[10px] font-bold text-destructive border border-destructive/30 hover:bg-destructive/5 disabled:opacity-50"
                >
                  {deletingId === doc.id ? (
                    <Loader2 className="w-3 h-3 animate-spin" />
                  ) : (
                    <Trash2 className="w-3 h-3" />
                  )}
                  Delete
                </button>
              )}
            </div>
          </li>
        ))}
      </ul>
    </div>
  );
}
