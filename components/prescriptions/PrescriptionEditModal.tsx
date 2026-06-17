'use client';

import { useEffect, useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  deletePrescriptionAction,
  getPrescriptionForEditAction,
  updatePrescriptionAction,
} from '@/lib/services/prescription-actions';
import type { PrescriptionEditInput } from '@/lib/validations/schemas';
import { Loader2, Pencil, Plus, Trash2, X } from 'lucide-react';

const emptyItem = {
  medicineName: '',
  dosage: '',
  frequency: '',
  duration: '',
  instructions: '',
  quantityRequested: 1,
};

export function PrescriptionDeleteButton({ prescriptionId }: { prescriptionId: string }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleDelete = async () => {
    if (!window.confirm('Delete this prescription permanently?')) return;
    setIsLoading(true);
    const res = await deletePrescriptionAction(prescriptionId);
    setIsLoading(false);
    if (res.success) {
      router.refresh();
    } else {
      setError(res.error || 'Delete failed');
    }
  };

  return (
    <div className="inline-flex flex-col items-end gap-1">
      <button
        type="button"
        onClick={handleDelete}
        disabled={isLoading}
        className="text-[10px] font-semibold text-destructive border border-destructive/30 px-2.5 py-1 rounded-lg flex items-center gap-1 disabled:opacity-60"
      >
        {isLoading ? <Loader2 className="w-3 h-3 animate-spin" /> : <Trash2 className="w-3 h-3" />}
        Delete
      </button>
      {error && <span className="text-[10px] text-destructive">{error}</span>}
    </div>
  );
}

export default function PrescriptionEditModal({ prescriptionId }: { prescriptionId: string }) {
  const router = useRouter();
  const [isOpen, setIsOpen] = useState(false);
  const [loading, setLoading] = useState(false);
  const [saving, setSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [notes, setNotes] = useState('');
  const [items, setItems] = useState<PrescriptionEditInput['items']>([{ ...emptyItem }]);

  useEffect(() => {
    if (!isOpen) return;
    setLoading(true);
    setError(null);
    getPrescriptionForEditAction(prescriptionId).then((res) => {
      setLoading(false);
      if (res.success && res.prescription) {
        setNotes(res.prescription.notes);
        setItems(res.prescription.items.length > 0 ? res.prescription.items : [{ ...emptyItem }]);
      } else {
        setError(res.error || 'Failed to load prescription');
      }
    });
  }, [isOpen, prescriptionId]);

  const updateItem = (index: number, field: keyof typeof emptyItem, value: string | number) => {
    setItems((prev) => prev.map((item, i) => (i === index ? { ...item, [field]: value } : item)));
  };

  const handleSave = async () => {
    setSaving(true);
    setError(null);
    const res = await updatePrescriptionAction(prescriptionId, { notes, items });
    setSaving(false);
    if (res.success) {
      setIsOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to save');
    }
  };

  return (
    <>
      <button
        type="button"
        onClick={() => setIsOpen(true)}
        className="text-[10px] font-semibold text-primary border border-primary/20 px-2.5 py-1 rounded-lg flex items-center gap-1 hover:bg-primary/5"
      >
        <Pencil className="w-3 h-3" />
        Edit
      </button>

      {isOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-2xl rounded-2xl shadow-premium border border-outline-variant/40 p-6 relative max-h-[90vh] overflow-y-auto">
            <button onClick={() => setIsOpen(false)} className="absolute right-4 top-4 text-on-surface-variant/40">
              <X className="w-5 h-5" />
            </button>
            <h3 className="text-base font-bold text-on-surface mb-4">Edit Prescription</h3>

            {loading && (
              <div className="flex justify-center py-12">
                <Loader2 className="w-6 h-6 animate-spin text-primary" />
              </div>
            )}

            {!loading && (
              <div className="space-y-4">
                {error && (
                  <div className="p-3 bg-destructive/5 border border-destructive/20 text-destructive text-xs rounded-xl">
                    {error}
                  </div>
                )}

                <div>
                  <label className="block text-[10px] font-semibold uppercase mb-1.5">Notes</label>
                  <textarea
                    value={notes}
                    onChange={(e) => setNotes(e.target.value)}
                    rows={2}
                    className="w-full px-3 py-2 bg-surface-container/30 border border-outline-variant rounded-xl text-xs"
                  />
                </div>

                <div className="space-y-3">
                  <div className="flex items-center justify-between">
                    <span className="text-xs font-bold text-on-surface">Medicines</span>
                    <button
                      type="button"
                      onClick={() => setItems((prev) => [...prev, { ...emptyItem }])}
                      className="text-[10px] font-bold text-primary flex items-center gap-1"
                    >
                      <Plus className="w-3 h-3" /> Add line
                    </button>
                  </div>

                  {items.map((item, index) => (
                    <div key={index} className="grid sm:grid-cols-2 gap-2 p-3 border border-outline-variant/40 rounded-xl">
                      <input
                        placeholder="Medicine name"
                        value={item.medicineName}
                        onChange={(e) => updateItem(index, 'medicineName', e.target.value)}
                        className="px-2 py-1.5 border border-outline-variant rounded-lg text-xs sm:col-span-2"
                      />
                      <input placeholder="Dosage" value={item.dosage} onChange={(e) => updateItem(index, 'dosage', e.target.value)} className="px-2 py-1.5 border border-outline-variant rounded-lg text-xs" />
                      <input placeholder="Frequency" value={item.frequency} onChange={(e) => updateItem(index, 'frequency', e.target.value)} className="px-2 py-1.5 border border-outline-variant rounded-lg text-xs" />
                      <input placeholder="Duration" value={item.duration} onChange={(e) => updateItem(index, 'duration', e.target.value)} className="px-2 py-1.5 border border-outline-variant rounded-lg text-xs" />
                      <input type="number" min={1} placeholder="Qty" value={item.quantityRequested} onChange={(e) => updateItem(index, 'quantityRequested', Number(e.target.value) || 1)} className="px-2 py-1.5 border border-outline-variant rounded-lg text-xs" />
                      <input placeholder="Instructions" value={item.instructions || ''} onChange={(e) => updateItem(index, 'instructions', e.target.value)} className="px-2 py-1.5 border border-outline-variant rounded-lg text-xs sm:col-span-2" />
                      {items.length > 1 && (
                        <button type="button" onClick={() => setItems((prev) => prev.filter((_, i) => i !== index))} className="text-[10px] text-destructive sm:col-span-2 text-left">
                          Remove line
                        </button>
                      )}
                    </div>
                  ))}
                </div>

                <div className="flex gap-3 pt-2">
                  <button type="button" onClick={() => setIsOpen(false)} className="w-1/2 border border-outline-variant py-2.5 rounded-xl text-xs font-semibold">
                    Cancel
                  </button>
                  <button type="button" onClick={handleSave} disabled={saving} className="w-1/2 bg-primary text-white py-2.5 rounded-xl text-xs font-semibold flex items-center justify-center gap-1.5 disabled:opacity-60">
                    {saving ? <Loader2 className="w-3.5 h-3.5 animate-spin" /> : 'Save Prescription'}
                  </button>
                </div>
              </div>
            )}
          </div>
        </div>
      )}
    </>
  );
}
