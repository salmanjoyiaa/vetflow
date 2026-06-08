'use client';

import { useMemo, useState } from 'react';
import Link from 'next/link';
import { Phone, Mail, ChevronRight, Heart, Calendar, Search } from 'lucide-react';
import { normalizePhoneInput, looksLikePhone } from '@/lib/reception/phone';

export type CustomerRow = {
  id: string;
  first_name: string;
  last_name: string;
  email: string | null;
  phone: string;
  address: string | null;
  petCount: number;
};

interface CustomersListClientProps {
  customers: CustomerRow[];
  initialPhone?: string;
  focusPhone?: boolean;
}

export default function CustomersListClient({
  customers,
  initialPhone = '',
  focusPhone = false,
}: CustomersListClientProps) {
  const [search, setSearch] = useState(initialPhone);

  const filtered = useMemo(() => {
    const q = search.trim().toLowerCase();
    if (!q) return customers;
    const phoneNorm = normalizePhoneInput(q);
    const phoneMode = looksLikePhone(q);
    return customers.filter((c) => {
      const name = `${c.first_name} ${c.last_name}`.toLowerCase();
      if (phoneMode) {
        const custPhone = normalizePhoneInput(c.phone);
        return custPhone.includes(phoneNorm) || name.includes(q);
      }
      return (
        name.includes(q) ||
        (c.phone && c.phone.toLowerCase().includes(q)) ||
        (c.email && c.email.toLowerCase().includes(q))
      );
    });
  }, [customers, search]);

  if (customers.length === 0) {
    return (
      <div className="glass-panel rounded-2xl border border-outline-variant/40 p-12 text-center">
        <Heart className="w-12 h-12 text-on-surface-variant/30 mx-auto mb-4" />
        <h4 className="text-sm font-bold text-on-surface mb-1">No Customers Found</h4>
        <p className="text-xs text-on-surface-variant/60">
          Register your first clinic customer using the button above.
        </p>
      </div>
    );
  }

  return (
    <div className="space-y-4">
      <div className="relative max-w-md">
        <Phone className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-primary" />
        <input
          type="search"
          autoFocus={focusPhone}
          placeholder="Search by phone (recommended) or name..."
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="w-full pl-9 pr-9 py-2.5 bg-surface-container border border-outline-variant rounded-xl text-xs"
        />
        <Search className="absolute right-3 top-1/2 -translate-y-1/2 w-4 h-4 text-outline" />
      </div>

      <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden shadow-premium">
        <table className="w-full text-left border-collapse">
          <thead>
            <tr className="bg-surface-container/40 border-b border-outline-variant/40 text-[10px] font-semibold text-on-surface/80 uppercase tracking-wider">
              <th className="px-6 py-4">Customer Name</th>
              <th className="px-6 py-4">Phone</th>
              <th className="px-6 py-4">Pets</th>
              <th className="px-6 py-4">Contact</th>
              <th className="px-6 py-4 text-right">Actions</th>
            </tr>
          </thead>
          <tbody className="divide-y divide-border/30 text-xs">
            {filtered.map((cust) => (
              <tr key={cust.id} className="hover:bg-surface-container/10 transition-colors">
                <td className="px-6 py-4 font-bold text-on-surface">
                  {cust.first_name} {cust.last_name}
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1.5 font-semibold text-primary">
                    <Phone className="w-3.5 h-3.5" />
                    {cust.phone}
                  </span>
                </td>
                <td className="px-6 py-4">
                  <span className="inline-flex items-center gap-1 bg-primary/5 text-primary px-2 py-0.5 rounded-full text-[10px] font-bold">
                    <Heart className="w-3 h-3" />
                    {cust.petCount} {cust.petCount === 1 ? 'Pet' : 'Pets'}
                  </span>
                </td>
                <td className="px-6 py-4 space-y-1">
                  {cust.email && (
                    <div className="flex items-center gap-1.5 text-on-surface-variant/70">
                      <Mail className="w-3.5 h-3.5 text-primary/60" />
                      <span>{cust.email}</span>
                    </div>
                  )}
                  <span className="text-on-surface-variant/60">{cust.address || '—'}</span>
                </td>
                <td className="px-6 py-4 text-right space-x-2">
                  <Link
                    href={`/dashboard/appointments?new=1&customerId=${cust.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline border border-primary/20 px-2 py-1 rounded-lg"
                  >
                    <Calendar className="w-3 h-3" />
                    Book
                  </Link>
                  <Link
                    href={`/dashboard/customers/${cust.id}`}
                    className="inline-flex items-center gap-1 text-[10px] font-bold text-primary hover:underline"
                  >
                    Profile
                    <ChevronRight className="w-3 h-3" />
                  </Link>
                </td>
              </tr>
            ))}
          </tbody>
        </table>
        {filtered.length === 0 && (
          <p className="text-center text-xs text-on-surface-variant py-8">
            No customers match your search.
          </p>
        )}
      </div>
    </div>
  );
}
