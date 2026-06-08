'use client';

import Link from 'next/link';
import {
  Calendar,
  ClipboardList,
  Receipt,
  Search,
  Layers,
  ArrowRight,
  AlertTriangle,
  User,
  Heart,
  Phone,
} from 'lucide-react';

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
};

export interface ReceptionistHomeClientProps {
  todayAppointments: number;
  waitingWalkIns: number;
  readyForCheckout: number;
  unpaidInvoices: number;
  upcomingAppointments: ReceptionistAppointmentRow[];
  waitingVisits: ReceptionistVisitRow[];
  checkoutVisits: ReceptionistVisitRow[];
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
  checkoutVisits,
}: ReceptionistHomeClientProps) {
  return (
    <div className="space-y-6">
      <div className="glass-panel rounded-2xl p-5 border border-outline-variant/40">
        <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
          Today at a glance
        </h3>
        <div className="grid grid-cols-2 md:grid-cols-4 gap-3">
          <GlanceCard label="Appointments" value={todayAppointments} icon={Calendar} href="/dashboard/appointments" />
          <GlanceCard label="Walk-ins waiting" value={waitingWalkIns} icon={ClipboardList} href="/dashboard/walk-ins" />
          <GlanceCard label="Ready checkout" value={readyForCheckout} icon={Receipt} href="/dashboard/walk-ins" highlight={readyForCheckout > 0} />
          <GlanceCard label="Unpaid invoices" value={unpaidInvoices} icon={Receipt} href="/dashboard/invoices?status=unpaid" highlight={unpaidInvoices > 0} />
        </div>
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
        <QuickChip href="/dashboard/customers?focus=phone" icon={Search} label="Search by phone" />
        <QuickChip href="/dashboard/inventory?tab=intake" icon={Layers} label="Stock invoice intake" />
        <QuickChip href="/dashboard/invoices?status=unpaid" icon={Receipt} label="Unpaid invoices" />
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
}: {
  href: string;
  icon: typeof Search;
  label: string;
}) {
  return (
    <Link
      href={href}
      className="inline-flex items-center gap-2 px-3 py-2 rounded-xl border border-outline-variant/50 text-xs font-semibold text-on-surface hover:bg-surface-container-high"
    >
      <Icon className="w-3.5 h-3.5 text-primary" />
      {label}
    </Link>
  );
}
