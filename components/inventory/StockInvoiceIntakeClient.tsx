'use client';

import { useState, useMemo } from 'react';
import { useRouter } from 'next/navigation';
import { parseStockInvoiceImageAction, type StockInvoiceDraft } from '@/lib/services/stock-invoice-ocr';
import { confirmStockIntakeAction } from '@/lib/services/inventory-actions';
import { Camera, Loader2, Plus, Trash2, CheckCircle, AlertTriangle, X, ClipboardList } from 'lucide-react';

type CatalogProduct = {
  id: string;
  name: string;
  sku: string | null;
};

type DraftRow = {
  name: string;
  sku: string;
  quantity: number;
  unitPrice: number;
  unit: string;
  productId: string | null;
  createNew: boolean;
};

interface StockInvoiceIntakeClientProps {
  activeBranchId: string;
  products: CatalogProduct[];
}

function fuzzyMatch(name: string, sku: string, catalog: CatalogProduct[]): string | null {
  const lower = name.toLowerCase();
  const skuLower = sku.toLowerCase();
  if (skuLower) {
    const bySku = catalog.find((p) => p.sku?.toLowerCase() === skuLower);
    if (bySku) return bySku.id;
  }
  const exact = catalog.find((p) => p.name.toLowerCase() === lower);
  if (exact) return exact.id;
  const partial = catalog.find(
    (p) => p.name.toLowerCase().includes(lower) || lower.includes(p.name.toLowerCase())
  );
  return partial?.id || null;
}

function draftToRows(draft: StockInvoiceDraft, catalog: CatalogProduct[]): DraftRow[] {
  return draft.lineItems.map((line) => {
    const matched = fuzzyMatch(line.name, line.sku || '', catalog);
    return {
      name: line.name,
      sku: line.sku || '',
      quantity: line.quantity,
      unitPrice: line.unitPrice,
      unit: line.unit || 'pcs',
      productId: matched,
      createNew: !matched,
    };
  });
}

export default function StockInvoiceIntakeClient({
  activeBranchId,
  products,
}: StockInvoiceIntakeClientProps) {
  const router = useRouter();
  const [supplierName, setSupplierName] = useState('');
  const [invoiceNumber, setInvoiceNumber] = useState('');
  const [invoiceDate, setInvoiceDate] = useState('');
  const [rows, setRows] = useState<DraftRow[]>([]);
  const [warnings, setWarnings] = useState<string[]>([]);
  const [isParsing, setIsParsing] = useState(false);
  const [isSaving, setIsSaving] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const [success, setSuccess] = useState(false);
  const [reviewOpen, setReviewOpen] = useState(false);

  const unmatchedCount = useMemo(
    () => rows.filter((r) => !r.productId && r.createNew).length,
    [rows]
  );

  const handleFile = async (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (!file) return;
    setIsParsing(true);
    setError(null);
    setSuccess(false);
    const fd = new FormData();
    fd.append('image', file);
    const res = await parseStockInvoiceImageAction(fd);
    if (res.success && res.draft) {
      setSupplierName(res.draft.supplierName || '');
      setInvoiceNumber(res.draft.invoiceNumber || '');
      setInvoiceDate(res.draft.invoiceDate || '');
      setRows(draftToRows(res.draft, products));
      setWarnings(res.warnings || []);
      setReviewOpen(true);
    } else {
      setError(res.error || 'Failed to parse image');
    }
    setIsParsing(false);
    e.target.value = '';
  };

  const updateRow = (idx: number, patch: Partial<DraftRow>) => {
    setRows((prev) => prev.map((r, i) => (i === idx ? { ...r, ...patch } : r)));
  };

  const removeRow = (idx: number) => {
    setRows((prev) => prev.filter((_, i) => i !== idx));
  };

  const addRow = () => {
    setRows((prev) => [
      ...prev,
      {
        name: '',
        sku: '',
        quantity: 1,
        unitPrice: 0,
        unit: 'pcs',
        productId: null,
        createNew: true,
      },
    ]);
  };

  const handleConfirm = async () => {
    if (rows.length === 0) {
      setError('Add at least one line item.');
      return;
    }
    setIsSaving(true);
    setError(null);
    const res = await confirmStockIntakeAction({
      branchId: activeBranchId,
      supplierName,
      invoiceNumber,
      invoiceDate,
      lines: rows.map((r) => ({
        name: r.name,
        sku: r.sku,
        quantity: r.quantity,
        unitPrice: r.unitPrice,
        unit: r.unit,
        productId: r.productId,
        createNew: r.createNew && !r.productId,
      })),
    });
    if (res.success) {
      setSuccess(true);
      setRows([]);
      setReviewOpen(false);
      router.refresh();
    } else {
      setError(res.error || 'Failed to save intake');
    }
    setIsSaving(false);
  };

  if (success) {
    return (
      <div className="glass-panel rounded-2xl border border-emerald-500/30 p-8 text-center space-y-4">
        <CheckCircle className="w-10 h-10 text-emerald-500 mx-auto" />
        <p className="text-sm font-bold text-on-surface">Stock intake saved successfully.</p>
        <button
          type="button"
          onClick={() => setSuccess(false)}
          className="text-xs font-bold text-primary"
        >
          Scan another invoice
        </button>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-6 space-y-4">
        <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
          <Camera className="w-4 h-4 text-primary" />
          Scan supplier invoice
        </h3>
        <p className="text-xs text-on-surface-variant">
          Upload a photo of a supplier invoice. AI will extract line items for you to review before
          saving to inventory.
        </p>
        <label className="inline-flex items-center gap-2 px-4 py-2.5 bg-primary text-white rounded-xl text-xs font-bold cursor-pointer hover:opacity-90">
          {isParsing ? (
            <>
              <Loader2 className="w-4 h-4 animate-spin" />
              Extracting...
            </>
          ) : (
            <>
              <Camera className="w-4 h-4" />
              Upload image
            </>
          )}
          <input
            type="file"
            accept="image/jpeg,image/png,image/webp"
            className="sr-only"
            disabled={isParsing}
            onChange={handleFile}
          />
        </label>
        {warnings.length > 0 && (
          <ul className="text-[10px] text-amber-600 space-y-1">
            {warnings.map((w, i) => (
              <li key={i} className="flex items-start gap-1">
                <AlertTriangle className="w-3 h-3 shrink-0 mt-0.5" />
                {w}
              </li>
            ))}
          </ul>
        )}
        {!reviewOpen && rows.length > 0 && (
          <button
            type="button"
            onClick={() => setReviewOpen(true)}
            className="inline-flex items-center gap-1.5 text-xs font-bold text-primary"
          >
            <ClipboardList className="w-3.5 h-3.5" />
            Review {rows.length} extracted item(s)
          </button>
        )}
      </div>

      {error && !reviewOpen && (
        <div className="text-xs text-destructive p-3 bg-destructive/5 rounded-xl border border-destructive/20">
          {error}
        </div>
      )}

      {reviewOpen && (
        <div className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/60 backdrop-blur-sm">
          <div className="glass-panel w-full max-w-4xl max-h-[90vh] overflow-y-auto rounded-2xl border border-outline-variant/40 shadow-premium relative">
            <div className="sticky top-0 z-10 bg-surface-container/95 backdrop-blur-md px-5 py-4 border-b border-outline-variant/40 flex items-center justify-between">
              <h3 className="text-sm font-bold text-on-surface flex items-center gap-2">
                <ClipboardList className="w-4 h-4 text-primary" />
                Confirm stock intake
              </h3>
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="text-on-surface-variant/50 hover:text-on-surface-variant"
              >
                <X className="w-5 h-5" />
              </button>
            </div>
          <div className="p-4 grid sm:grid-cols-3 gap-3 border-b border-outline-variant/30">
            <input
              placeholder="Supplier name"
              value={supplierName}
              onChange={(e) => setSupplierName(e.target.value)}
              className="px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface-container"
            />
            <input
              placeholder="Invoice number"
              value={invoiceNumber}
              onChange={(e) => setInvoiceNumber(e.target.value)}
              className="px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface-container"
            />
            <input
              type="date"
              value={invoiceDate}
              onChange={(e) => setInvoiceDate(e.target.value)}
              className="px-3 py-2 text-xs border border-outline-variant rounded-lg bg-surface-container"
            />
          </div>

          <table className="w-full text-left text-xs">
            <thead>
              <tr className="bg-surface-container/30 text-[9px] uppercase font-bold text-on-surface-variant">
                <th className="px-4 py-2">Product</th>
                <th className="px-4 py-2">Qty</th>
                <th className="px-4 py-2">Unit price</th>
                <th className="px-4 py-2">Catalog match</th>
                <th className="px-4 py-2" />
              </tr>
            </thead>
            <tbody className="divide-y divide-outline-variant/30">
              {rows.map((row, idx) => (
                <tr key={idx}>
                  <td className="px-4 py-2">
                    <input
                      value={row.name}
                      onChange={(e) => updateRow(idx, { name: e.target.value })}
                      className="w-full px-2 py-1 border border-outline-variant rounded text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      min={1}
                      value={row.quantity}
                      onChange={(e) => updateRow(idx, { quantity: Number(e.target.value) })}
                      className="w-16 px-2 py-1 border border-outline-variant rounded text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <input
                      type="number"
                      step="0.01"
                      value={row.unitPrice}
                      onChange={(e) => updateRow(idx, { unitPrice: Number(e.target.value) })}
                      className="w-20 px-2 py-1 border border-outline-variant rounded text-xs"
                    />
                  </td>
                  <td className="px-4 py-2">
                    <select
                      value={row.productId || (row.createNew ? '__new__' : '')}
                      onChange={(e) => {
                        const v = e.target.value;
                        if (v === '__new__') {
                          updateRow(idx, { productId: null, createNew: true });
                        } else {
                          updateRow(idx, { productId: v, createNew: false });
                        }
                      }}
                      className="w-full px-2 py-1 border border-outline-variant rounded text-xs"
                    >
                      <option value="__new__">Create new product</option>
                      {products.map((p) => (
                        <option key={p.id} value={p.id}>
                          {p.name}
                          {p.sku ? ` (${p.sku})` : ''}
                        </option>
                      ))}
                    </select>
                  </td>
                  <td className="px-4 py-2">
                    <button type="button" onClick={() => removeRow(idx)} className="text-destructive">
                      <Trash2 className="w-4 h-4" />
                    </button>
                  </td>
                </tr>
              ))}
            </tbody>
          </table>

          <div className="p-4 flex items-center justify-between border-t border-outline-variant/30">
            <button
              type="button"
              onClick={addRow}
              className="text-xs font-bold text-primary flex items-center gap-1"
            >
              <Plus className="w-3 h-3" />
              Add row
            </button>
            {unmatchedCount > 0 && (
              <span className="text-[10px] text-amber-600">
                {unmatchedCount} new product(s) will be created
              </span>
            )}
          </div>

            {error && (
              <div className="mx-4 mb-4 text-xs text-destructive p-3 bg-destructive/5 rounded-xl border border-destructive/20">
                {error}
              </div>
            )}

            <div className="sticky bottom-0 bg-surface-container/95 backdrop-blur-md px-5 py-4 border-t border-outline-variant/40 flex items-center justify-end gap-3">
              <button
                type="button"
                onClick={() => setReviewOpen(false)}
                className="px-4 py-2.5 border border-outline-variant rounded-xl text-xs font-semibold text-on-surface hover:bg-surface-container"
              >
                Cancel
              </button>
              <button
                type="button"
                disabled={isSaving || rows.length === 0}
                onClick={handleConfirm}
                className="px-6 py-2.5 bg-primary text-white rounded-xl text-xs font-bold flex items-center justify-center gap-2 disabled:opacity-70"
              >
                {isSaving ? <Loader2 className="w-4 h-4 animate-spin" /> : <CheckCircle className="w-4 h-4" />}
                Confirm stock intake
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
