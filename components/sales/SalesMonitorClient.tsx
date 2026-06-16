'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { useCurrency } from '@/lib/context/CurrencyContext';
import { DollarSign, ShoppingBag, TrendingUp, Printer } from 'lucide-react';

export type RetailSaleRow = {
  id: string;
  invoiceNumber: string;
  createdAt: string;
  customerName: string;
  total: number;
  itemSummary: string;
  soldByName: string;
};

interface SalesMonitorClientProps {
  todayRevenue: number;
  todayCount: number;
  topProducts: { name: string; qty: number }[];
  sales: RetailSaleRow[];
}

export default function SalesMonitorClient({
  todayRevenue,
  todayCount,
  topProducts,
  sales,
}: SalesMonitorClientProps) {
  const { formatCurrency } = useCurrency();
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');
  const [search, setSearch] = useState('');

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    return sales.filter((s) => {
      const d = s.createdAt.slice(0, 10);
      if (dateFrom && d < dateFrom) return false;
      if (dateTo && d > dateTo) return false;
      if (!q) return true;
      return (
        s.customerName.toLowerCase().includes(q) ||
        s.invoiceNumber.toLowerCase().includes(q) ||
        s.itemSummary.toLowerCase().includes(q)
      );
    });
  }, [sales, dateFrom, dateTo, search]);

  return (
    <div className="space-y-6">
      <div className="grid sm:grid-cols-3 gap-4">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5">
          <div className="flex items-center gap-2 text-on-surface-variant mb-2">
            <DollarSign className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase">Today&apos;s retail revenue</span>
          </div>
          <p className="text-2xl font-black text-on-surface">{formatCurrency(todayRevenue)}</p>
        </div>
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5">
          <div className="flex items-center gap-2 text-on-surface-variant mb-2">
            <ShoppingBag className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase">Transactions today</span>
          </div>
          <p className="text-2xl font-black text-on-surface">{todayCount}</p>
        </div>
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5">
          <div className="flex items-center gap-2 text-on-surface-variant mb-2">
            <TrendingUp className="w-4 h-4 text-primary" />
            <span className="text-[10px] font-bold uppercase">Top products (30d)</span>
          </div>
          {topProducts.length === 0 ? (
            <p className="text-xs text-on-surface-variant/60 italic">No data yet</p>
          ) : (
            <ul className="text-xs space-y-1">
              {topProducts.slice(0, 3).map((p) => (
                <li key={p.name} className="flex justify-between">
                  <span className="truncate">{p.name}</span>
                  <span className="font-bold">{p.qty}</span>
                </li>
              ))}
            </ul>
          )}
        </div>
      </div>

      <div className="flex flex-col sm:flex-row gap-3">
        <input
          type="search"
          placeholder="Search customer, invoice #…"
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="flex-1 px-3 py-2 border border-outline-variant rounded-xl text-xs"
        />
        <input type="date" value={dateFrom} onChange={(e) => setDateFrom(e.target.value)} className="px-3 py-2 border rounded-xl text-xs" />
        <input type="date" value={dateTo} onChange={(e) => setDateTo(e.target.value)} className="px-3 py-2 border rounded-xl text-xs" />
        <Link
          href="/dashboard/sales/new"
          className="px-4 py-2 rounded-xl bg-primary text-white text-xs font-bold text-center"
        >
          New sale
        </Link>
      </div>

      <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden">
        <table className="w-full text-left text-xs">
          <thead>
            <tr className="bg-surface-container/40 border-b border-outline-variant/30 text-[10px] uppercase text-on-surface-variant">
              <th className="px-5 py-3">Time</th>
              <th className="px-5 py-3">Invoice</th>
              <th className="px-5 py-3">Customer</th>
              <th className="px-5 py-3">Items</th>
              <th className="px-5 py-3">Sold by</th>
              <th className="px-5 py-3 text-right">Total</th>
              <th className="px-5 py-3 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-outline-variant/20">
            {filtered.length === 0 ? (
              <tr>
                <td colSpan={7} className="px-5 py-8 text-center text-on-surface-variant/60 italic">
                  No retail sales match your filters.
                </td>
              </tr>
            ) : (
              filtered.map((s) => (
                <tr key={s.id} className="hover:bg-surface-container/20">
                  <td className="px-5 py-3 text-on-surface-variant">
                    {new Date(s.createdAt).toLocaleString()}
                  </td>
                  <td className="px-5 py-3 font-mono font-bold">{s.invoiceNumber}</td>
                  <td className="px-5 py-3">{s.customerName}</td>
                  <td className="px-5 py-3 text-on-surface-variant max-w-xs truncate">{s.itemSummary}</td>
                  <td className="px-5 py-3 text-on-surface-variant">{s.soldByName}</td>
                  <td className="px-5 py-3 text-right font-bold">{formatCurrency(s.total)}</td>
                  <td className="px-5 py-3 text-right">
                    <div className="flex justify-end gap-2">
                      <Link href={`/dashboard/invoices/${s.id}`} className="text-primary font-bold hover:underline">
                        View
                      </Link>
                      <a
                        href={`/api/invoices/${s.id}/pdf`}
                        target="_blank"
                        rel="noopener noreferrer"
                        className="text-on-surface-variant hover:text-primary"
                        title="Print PDF"
                      >
                        <Printer className="w-3.5 h-3.5" />
                      </a>
                    </div>
                  </td>
                </tr>
              ))
            )}
          </tbody>
        </table>
      </div>
    </div>
  );
}
