'use client';

import { useMemo, useState } from 'react';
import StockAdjustmentForm from '@/components/forms/StockAdjustmentForm';
import { ShieldAlert } from 'lucide-react';

const TYPE_TABS = [
  { id: 'all', label: 'All' },
  { id: 'medicine', label: 'Medicine' },
  { id: 'food', label: 'Food' },
  { id: 'treats', label: 'Treats' },
  { id: 'accessory', label: 'Accessories' },
  { id: 'service', label: 'Services' },
] as const;

type TypeTab = (typeof TYPE_TABS)[number]['id'];

interface ProductRow {
  id: string;
  name: string;
  brand: string | null;
  sku: string | null;
  unit: string | null;
  type: string;
  purchase_price: number;
  selling_price: number;
  stock_quantity: number;
  reorder_level: number;
  product_categories: { name: string } | null;
}

interface InventoryCatalogClientProps {
  products: ProductRow[];
  activeBranchId: string;
}

export default function InventoryCatalogClient({
  products,
  activeBranchId,
}: InventoryCatalogClientProps) {
  const [typeTab, setTypeTab] = useState<TypeTab>('all');

  const filtered = useMemo(() => {
    if (typeTab === 'all') return products;
    return products.filter((p) => p.type === typeTab);
  }, [products, typeTab]);

  if (products.length === 0) return null;

  return (
    <div className="space-y-4">
      <div className="flex flex-wrap gap-2">
        {TYPE_TABS.map((t) => (
          <button
            key={t.id}
            type="button"
            onClick={() => setTypeTab(t.id)}
            className={`px-3 py-1.5 rounded-lg text-[10px] font-bold transition-colors ${
              typeTab === t.id
                ? 'bg-primary text-white'
                : 'bg-surface-container border border-outline-variant text-on-surface-variant'
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
              <th className="px-6 py-4">Item Details</th>
              <th className="px-6 py-4">Type & Category</th>
              <th className="px-6 py-4">Pricing</th>
              <th className="px-6 py-4">Stock Balance</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-xs">
            {filtered.map((prod) => {
              const isLowStock =
                prod.type !== 'service' && prod.stock_quantity <= prod.reorder_level;
              return (
                <tr key={prod.id} className="hover:bg-surface-container/10 transition-colors">
                  <td className="px-6 py-4">
                    <span className="font-bold text-on-surface block">{prod.name}</span>
                    <span className="text-[10px] text-on-surface-variant/50 block">
                      {prod.brand && `Brand: ${prod.brand}`} {prod.sku && `• SKU: ${prod.sku}`}
                    </span>
                  </td>
                  <td className="px-6 py-4 capitalize text-on-surface-variant/70">
                    <span className="font-semibold text-on-surface">{prod.type}</span>
                    {prod.product_categories && (
                      <span className="text-on-surface-variant/60 block text-[10px]">
                        Category: {prod.product_categories.name}
                      </span>
                    )}
                  </td>
                  <td className="px-6 py-4 space-y-0.5 text-on-surface-variant/80 font-medium">
                    <div>Sell: ${Number(prod.selling_price).toFixed(2)}</div>
                    <div className="text-[10px] text-on-surface-variant/50">
                      Buy: ${Number(prod.purchase_price).toFixed(2)}
                    </div>
                  </td>
                  <td className="px-6 py-4">
                    {prod.type === 'service' ? (
                      <span className="text-on-surface-variant/50 italic font-semibold">
                        Virtual Service
                      </span>
                    ) : (
                      <div className="space-y-1">
                        <span
                          className={`font-bold ${isLowStock ? 'text-destructive' : 'text-on-surface'}`}
                        >
                          {prod.stock_quantity} {prod.unit || 'pcs'}
                        </span>
                        {isLowStock && (
                          <span className="flex items-center gap-1 text-[9px] font-bold text-destructive bg-destructive/5 border border-destructive/20 px-2 py-0.5 rounded-lg w-max">
                            <ShieldAlert className="w-3 h-3" />
                            Low Stock (Limit {prod.reorder_level})
                          </span>
                        )}
                      </div>
                    )}
                  </td>
                  <td className="px-6 py-4 text-right">
                    {prod.type !== 'service' ? (
                      <StockAdjustmentForm
                        productId={prod.id}
                        productName={prod.name}
                        branchId={activeBranchId}
                        currentStock={prod.stock_quantity}
                      />
                    ) : (
                      <span className="text-[10px] text-on-surface-variant/40 italic">
                        Billed Service
                      </span>
                    )}
                  </td>
                </tr>
              );
            })}
          </tbody>
        </table>
      </div>
    </div>
  );
}
