'use client';

import { useState } from 'react';
import { useRouter } from 'next/navigation';
import {
  createServiceAction,
  updateServiceAction,
  deleteServiceAction,
} from '@/lib/services/service-catalog-actions';
import { Plus, Trash2, Loader2, Stethoscope, Pencil } from 'lucide-react';

export interface ServiceRow {
  id: string;
  name: string;
  description: string | null;
  price: number;
  is_active: boolean;
}

interface ServicesCatalogClientProps {
  initialServices: ServiceRow[];
}

export default function ServicesCatalogClient({ initialServices }: ServicesCatalogClientProps) {
  const router = useRouter();
  const [services, setServices] = useState(initialServices);
  const [editingId, setEditingId] = useState<string | null>(null);
  const [name, setName] = useState('');
  const [description, setDescription] = useState('');
  const [price, setPrice] = useState('');
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const resetForm = () => {
    setEditingId(null);
    setName('');
    setDescription('');
    setPrice('');
    setError(null);
  };

  const startEdit = (svc: ServiceRow) => {
    setEditingId(svc.id);
    setName(svc.name);
    setDescription(svc.description || '');
    setPrice(String(svc.price));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();
    setLoading(true);
    setError(null);
    const payload = {
      name: name.trim(),
      description: description.trim(),
      price: parseFloat(price) || 0,
      isActive: true,
    };

    const res = editingId
      ? await updateServiceAction({ ...payload, serviceId: editingId })
      : await createServiceAction(payload);

    if (res.success) {
      resetForm();
      router.refresh();
    } else {
      setError(res.error || 'Failed to save service');
    }
    setLoading(false);
  };

  const handleDelete = async (serviceId: string) => {
    if (!confirm('Deactivate this service?')) return;
    setLoading(true);
    const res = await deleteServiceAction({ serviceId });
    if (res.success) {
      setServices((prev) => prev.filter((s) => s.id !== serviceId));
      router.refresh();
    } else {
      setError(res.error || 'Failed to deactivate');
    }
    setLoading(false);
  };

  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 shadow-premium space-y-6">
      <div className="flex items-center gap-2 border-b border-outline-variant/30 pb-4">
        <Stethoscope className="w-5 h-5 text-primary" />
        <div>
          <h3 className="text-sm font-bold text-on-surface">Service Catalog</h3>
          <p className="text-[10px] text-on-surface-variant">
            Manage billable services doctors can add during consultations.
          </p>
        </div>
      </div>

      <form onSubmit={handleSubmit} className="grid sm:grid-cols-12 gap-3 items-end">
        <div className="sm:col-span-4">
          <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Name</label>
          <input
            value={name}
            onChange={(e) => setName(e.target.value)}
            required
            placeholder="e.g. Vaccination"
            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-xl text-xs"
          />
        </div>
        <div className="sm:col-span-4">
          <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Description</label>
          <input
            value={description}
            onChange={(e) => setDescription(e.target.value)}
            placeholder="Optional"
            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-xl text-xs"
          />
        </div>
        <div className="sm:col-span-2">
          <label className="block text-[9px] font-bold text-on-surface-variant uppercase mb-1">Price</label>
          <input
            type="number"
            step="0.01"
            min="0"
            value={price}
            onChange={(e) => setPrice(e.target.value)}
            required
            className="w-full px-3 py-2 bg-surface border border-outline-variant rounded-xl text-xs"
          />
        </div>
        <div className="sm:col-span-2 flex gap-2">
          <button
            type="submit"
            disabled={loading}
            className="flex-1 bg-primary text-white px-3 py-2 rounded-xl text-xs font-bold flex items-center justify-center gap-1"
          >
            {loading ? <Loader2 className="w-3 h-3 animate-spin" /> : editingId ? <Pencil className="w-3 h-3" /> : <Plus className="w-3 h-3" />}
            {editingId ? 'Update' : 'Add'}
          </button>
          {editingId && (
            <button type="button" onClick={resetForm} className="text-xs text-on-surface-variant hover:underline">
              Cancel
            </button>
          )}
        </div>
      </form>

      {error && <p className="text-xs text-destructive">{error}</p>}

      <div className="divide-y divide-outline-variant/30">
        {services.filter((s) => s.is_active).map((svc) => (
          <div key={svc.id} className="py-3 flex items-center justify-between gap-4">
            <div>
              <span className="text-xs font-bold text-on-surface">{svc.name}</span>
              {svc.description && (
                <p className="text-[10px] text-on-surface-variant">{svc.description}</p>
              )}
            </div>
            <div className="flex items-center gap-3">
              <span className="text-xs font-bold text-primary">${Number(svc.price).toFixed(2)}</span>
              <button type="button" onClick={() => startEdit(svc)} className="text-[10px] text-primary font-bold hover:underline">
                Edit
              </button>
              <button
                type="button"
                onClick={() => handleDelete(svc.id)}
                className="text-destructive hover:bg-destructive/10 p-1 rounded"
              >
                <Trash2 className="w-3.5 h-3.5" />
              </button>
            </div>
          </div>
        ))}
        {services.filter((s) => s.is_active).length === 0 && (
          <p className="text-xs text-on-surface-variant/60 py-4 text-center italic">
            No services configured. Add your first service above.
          </p>
        )}
      </div>
    </div>
  );
}
