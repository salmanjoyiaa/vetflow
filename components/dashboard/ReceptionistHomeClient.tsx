'use client';

import Link from 'next/link';
import { useMemo, useState } from 'react';
import {
  Calendar,
  ClipboardList,
  BadgeCheck,
  Banknote,
  Search,
  Layers,
  ArrowRight,
  AlertTriangle,
  Heart,
  Phone,
  UserPlus,
  Printer,
  FileText,
} from 'lucide-react';
import { useVisibilityPolling } from '@/lib/hooks/useVisibilityPolling';

export type ReceptionistAppointmentRow = {
  id: string;
  petName: string;
  customerName: string;
  customerPhone: string;
  preferredTime: string;
  isEmergency: boolean;
};

export type ReceptionistVisitRow = {
  id: string;
  petName: string;
  customerName: string;
  reason: string;
  status: string;
  doctorName?: string;
};

export type VisitRecordRow = {
  id: string;
  invoiceNumber: string;
  visitId: string | null;
  customerName: string;
  petName: string;
  total: number;
  paymentStatus: string;
  createdAt: string;
};

export interface ReceptionistHomeClientProps {
  todayAppointments: number;
  waitingWalkIns: number;
  readyForCheckout: number;
  unpaidInvoices: number;
  upcomingAppointments: ReceptionistAppointmentRow[];
  waitingVisits: ReceptionistVisitRow[];
  consultingVisits?: ReceptionistVisitRow[];
  checkoutVisits: ReceptionistVisitRow[];
  visitRecords: VisitRecordRow[];
}

const WORKFLOW_STEPS = [
  { step: 1, label: 'Find patient', href: '/dashboard/customers?focus=phone' },
  { step: 2, label: 'Book / Check-in', href: '/dashboard/appointments?new=1' },
  { step: 3, label: 'Doctor visit', href: '/dashboard/walk-ins' },
  { step: 4, label: 'Checkout & print', href: '/dashboard/walk-ins' },
];

export default function ReceptionistHomeClient({
  todayAppointments,
  waitingWalkIns,
  readyForCheckout,
  unpaidInvoices,
  upcomingAppointments,
  waitingVisits,
  consultingVisits = [],
  checkoutVisits,
  visitRecords,
}: ReceptionistHomeClientProps) {
  useVisibilityPolling(15000, true);

  const [recordSearch, setRecordSearch] = useState('');
  const [dateFrom, setDateFrom] = useState('');
  const [dateTo, setDateTo] = useState('');

  const filteredRecords = useMemo(() => {
    const q = recordSearch.trim().toLowerCase();
    return visitRecords.filter((r) => {
      if (dateFrom && r.createdAt.slice(0, 10) < dateFrom) return false;
      if (dateTo && r.createdAt.slice(0, 10) > dateTo) return false;
      if (!q) return true;
      return (
        r.customerName.toLowerCase().includes(q) ||
        r.petName.toLowerCase().includes(q) ||
        r.invoiceNumber.toLowerCase().includes(q)
      );
    });
  }, [visitRecords, recordSearch, dateFrom, dateTo]);

  return (
    <div className="space-y-6">
      {readyForCheckout > 0 && (
        <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-3 p-4 rounded-xl bg-emerald-500/10 border border-emerald-500/30">
          <div>
            <p className="text-sm font-bold text-emerald-700">
              {readyForCheckout} patient{readyForCheckout > 1 ? 's' : ''} ready for checkout
            </p>
            <p className="text-xs text-emerald-600/80">
              Doctor completed consultation — proceed to billing.
            </p>
          </div>
          {checkoutVisits[0] && (
            <Link
              href={`/dashboard/invoices/create/${checkoutVisits[0].id}`}
              className="shrink-0 bg-emerald-600 text-white px-4 py-2 rounded-xl text-xs font-bold"
            >
              Start checkout →
            </Link>
          )}
        </div>
      )}

      {consultingVisits.length > 0 && (
        <div className="glass-panel rounded-2xl border border-blue-500/30 p-4 space-y-2">
          <h3 className="text-xs font-bold text-blue-400 uppercase tracking-wider">
            Consultations in progress
          </h3>
          {consultingVisits.map((v) => (
            <div key={v.id} className="flex items-center justify-between text-xs">
              <span className="font-bold text-on-surface">
                {v.petName} — {v.customerName}
              </span>
              <span className="text-blue-400 font-semibold">
                {v.doctorName || 'Doctor'} consulting
              </span>
            </div>
          ))}
        </div>
      )}

      <Link
        href="/dashboard/walk-ins?new=1"
        className="flex items-center justify-center gap-3 w-full py-4 px-6 rounded-2xl bg-primary text-on-primary font-bold text-sm shadow-premium hover:opacity-90 transition-all"
      >
        <UserPlus className="w-5 h-5" />
        Quick walk-in — patient just arrived
        <ArrowRight className="w-4 h-4 opacity-80" />
      </Link>

      <div className="glass-panel rounded-2xl p-5 border border-outline-variant/40">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
          Today at a glance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlanceCard label="Appointments" value={todayAppointments} icon={Calendar} href="/dashboard/appointments" />
          <GlanceCard label="Walk-ins waiting" value={waitingWalkIns} icon={ClipboardList} href="/dashboard/walk-ins" />
          <GlanceCard
            label="Ready checkout"
            value={readyForCheckout}
            icon={BadgeCheck}
            href="/dashboard/walk-ins"
            highlight={readyForCheckout > 0}
          />
          <GlanceCard
            label="Unpaid invoices"
            value={unpaidInvoices}
            icon={Banknote}
            href="/dashboard/invoices?status=unpaid"
            highlight={unpaidInvoices > 0}
          />
        </div>
      </div>

      <div className="glass-panel rounded-2xl p-5 border border-outline-variant/40">
        <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-3 mb-4">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
            Visit records — invoices & treatments
          </h3>
          <Link href="/dashboard/invoices" className="text-[10px] text-primary font-bold hover:underline">
            Full billing ledger →
          </Link>
        </div>
        <div className="flex flex-wrap gap-2 mb-3">
          <input
            type="search"
            value={recordSearch}
            onChange={(e) => setRecordSearch(e.target.value)}
            placeholder="Search owner, pet, or invoice #..."
            className="flex-1 min-w-[180px] px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface outline-none focus:border-primary"
          />
          <input
            type="date"
            value={dateFrom}
            onChange={(e) => setDateFrom(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface outline-none"
            aria-label="From date"
          />
          <input
            type="date"
            value={dateTo}
            onChange={(e) => setDateTo(e.target.value)}
            className="px-3 py-2 text-xs rounded-xl bg-surface-container border border-outline-variant text-on-surface outline-none"
            aria-label="To date"
          />
        </div>
        {filteredRecords.length === 0 ? (
          <p className="text-[10px] text-on-surface-variant/60 text-center py-6 italic">
            No visit records match your filters.
          </p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-left text-xs">
              <thead>
                <tr className="text-[10px] uppercase text-on-surface-variant border-b border-outline-variant/30">
                  <th className="py-2 pr-3">Date</th>
                  <th className="py-2 pr-3">Owner / Pet</th>
                  <th className="py-2 pr-3">Invoice</th>
                  <th className="py-2 pr-3">Status</th>
                  <th className="py-2 text-right">PDFs</th>
                </tr>
              </thead>
              <tbody className="divide-y divide-outline-variant/20">
                {filteredRecords.slice(0, 12).map((r) => (
                  <tr key={r.id}>
                    <td className="py-2.5 pr-3 text-on-surface-variant whitespace-nowrap">
                      {new Date(r.createdAt).toLocaleDateString()}
                    </td>
                    <td className="py-2.5 pr-3">
                      <span className="font-semibold text-on-surface block">{r.customerName}</span>
                      <span className="text-[10px] text-on-surface-variant">{r.petName}</span>
                    </td>
                    <td className="py-2.5 pr-3 font-mono text-[10px]">{r.invoiceNumber}</td>
                    <td className="py-2.5 pr-3 capitalize">{r.paymentStatus}</td>
                    <td className="py-2.5 text-right">
                      <div className="flex items-center justify-end gap-1">
                        <a
                          href={`/api/invoices/${r.id}/pdf`}
                          target="_blank"
                          rel="noopener noreferrer"
                          className="inline-flex items-center gap-0.5 text-[9px] font-bold text-primary border border-primary/20 px-2 py-1 rounded-lg hover:bg-primary/10"
                        >
                          <Printer className="w-3 h-3" />
                          Invoice
                        </a>
                        {r.visitId && (
                          <a
                            href={`/api/visits/${r.visitId}/treatment-pdf`}
                            target="_blank"
                            rel="noopener noreferrer"
                            className="inline-flex items-center gap-0.5 text-[9px] font-bold text-secondary border border-secondary/20 px-2 py-1 rounded-lg hover:bg-secondary/10"
                          >
                            <FileText className="w-3 h-3" />
                            Treatment
                          </a>
                        )}
                      </div>
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}
      </div>

      <div className="glass-panel rounded-2xl p-5 border border-outline-variant/40">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-3">
          Daily workflow
        </h3>
        <div className="flex flex-wrap gap-2">
          {WORKFLOW_STEPS.map((s, i) => (
            <Link
              key={s.step}
              href={s.href}
              className="flex items-center gap-2 px-3 py-2 rounded-xl bg-surface-container/50 border border-outline-variant/50 text-xs font-semibold text-on-surface hover:border-primary/40 hover:bg-primary/5 transition-colors"
            >
              <span className="w-5 h-5 rounded-full bg-primary/15 text-primary text-[10px] font-bold flex items-center justify-center">
                {s.step}
              </span>
              {s.label}
              {i < WORKFLOW_STEPS.length - 1 && (
                <ArrowRight className="w-3 h-3 text-on-surface-variant/40 hidden sm:block" />
              )}
            </Link>
          ))}
        </div>
      </div>

      <div className="grid md:grid-cols-3 gap-4">
        <QueuePanel
          title="Upcoming appointments"
          empty="No appointments scheduled for today."
          href="/dashboard/appointments"
          isEmpty={upcomingAppointments.length === 0}
        >
          {upcomingAppointments.map((a) => (
            <Link
              key={a.id}
              href="/dashboard/appointments"
              className="block px-4 py-3 hover:bg-surface-container/30 border-b border-outline-variant/20 last:border-0"
            >
              <div className="flex items-center gap-2">
                <span className="text-xs font-bold text-on-surface">{a.petName}</span>
                {a.isEmergency && (
                  <span className="text-[9px] font-bold text-destructive flex items-center gap-0.5">
                    <AlertTriangle className="w-2.5 h-2.5" />
                    EMERGENCY
                  </span>
                )}
              </div>
              <span className="text-[10px] text-on-surface-variant block">
                {a.customerName} · <Phone className="w-2.5 h-2.5 inline" /> {a.customerPhone}
              </span>
              <span className="text-[10px] text-primary font-semibold">{a.preferredTime}</span>
            </Link>
          ))}
        </QueuePanel>

        <QueuePanel title="Waiting walk-ins" empty="No patients waiting." href="/dashboard/walk-ins" isEmpty={waitingVisits.length === 0}>
          {waitingVisits.map((v) => (
            <Link
              key={v.id}
              href="/dashboard/walk-ins"
              className="block px-4 py-3 hover:bg-surface-container/30 border-b border-outline-variant/20 last:border-0"
            >
              <span className="text-xs font-bold text-on-surface flex items-center gap-1">
                <Heart className="w-3 h-3 text-primary" />
                {v.petName}
              </span>
              <span className="text-[10px] text-on-surface-variant block">{v.customerName}</span>
              <span className="text-[10px] text-on-surface-variant/70 line-clamp-1">{v.reason}</span>
            </Link>
          ))}
        </QueuePanel>

        <QueuePanel title="Ready for checkout" empty="No patients awaiting billing." href="/dashboard/walk-ins" isEmpty={checkoutVisits.length === 0}>
          {checkoutVisits.map((v) => (
            <Link
              key={v.id}
              href={`/dashboard/invoices/create/${v.id}`}
              className="block px-4 py-3 hover:bg-surface-container/30 border-b border-outline-variant/20 last:border-0"
            >
              <span className="text-xs font-bold text-on-surface">{v.petName}</span>
              <span className="text-[10px] text-on-surface-variant block">{v.customerName}</span>
              <span className="text-[10px] text-emerald-500 font-bold">Open checkout hub →</span>
            </Link>
          ))}
        </QueuePanel>
      </div>

      <div className="flex flex-wrap gap-2">
        <QuickChip href="/dashboard/walk-ins?new=1" icon={UserPlus} label="Quick walk-in" primary />
        <QuickChip href="/dashboard/customers?focus=phone" icon={Search} label="Search by phone" />
        <QuickChip href="/dashboard/inventory?tab=intake" icon={Layers} label="Stock invoice intake" />
        <QuickChip href="/dashboard/invoices?status=unpaid" icon={Banknote} label="Unpaid invoices" />
        <QuickChip href="/dashboard/appointments?new=1" icon={Calendar} label="New appointment" />
      </div>
    </div>
  );
}

function GlanceCard({
  label,
  value,
  icon: Icon,
  href,
  highlight,
}: {
  label: string;
  value: number;
  icon: typeof Calendar;
  href: string;
  highlight?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`rounded-xl p-3 border transition-colors hover:border-primary/30 ${
        highlight ? 'border-amber-500/30 bg-amber-500/5' : 'border-outline-variant/40 bg-surface-container/30'
      }`}
    >
      <Icon className="w-4 h-4 text-primary mb-1" />
      <span className="text-lg font-black text-on-surface block">{value}</span>
      <span className="text-[10px] text-on-surface-variant font-semibold">{label}</span>
    </Link>
  );
}

function QueuePanel({
  title,
  empty,
  href,
  isEmpty,
  children,
}: {
  title: string;
  empty: string;
  href: string;
  isEmpty: boolean;
  children: React.ReactNode;
}) {
  return (
    <div className="glass-panel rounded-2xl border border-outline-variant/40 overflow-hidden">
      <div className="px-4 py-3 border-b border-outline-variant/30 flex items-center justify-between">
        <h4 className="text-[10px] font-bold text-on-surface uppercase tracking-wider">{title}</h4>
        <Link href={href} className="text-[10px] text-primary font-bold hover:underline">
          View all
        </Link>
      </div>
      {!isEmpty ? (
        <div>{children}</div>
      ) : (
        <p className="px-4 py-6 text-[10px] text-on-surface-variant/60 text-center italic">{empty}</p>
      )}
    </div>
  );
}

function QuickChip({
  href,
  icon: Icon,
  label,
  primary,
}: {
  href: string;
  icon: typeof Search;
  label: string;
  primary?: boolean;
}) {
  return (
    <Link
      href={href}
      className={`inline-flex items-center gap-2 px-3 py-2 rounded-xl border text-xs font-semibold transition-colors ${
        primary
          ? 'bg-primary/15 border-primary/30 text-primary hover:bg-primary/25'
          : 'border-outline-variant/50 text-on-surface hover:bg-surface-container-high'
      }`}
    >
      <Icon className="w-3.5 h-3.5 text-primary" />
      {label}
    </Link>
  );
}
