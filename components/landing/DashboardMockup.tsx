'use client';

import { useRef, useSyncExternalStore } from 'react';
import { motion, useMotionValue, useSpring, useTransform } from 'framer-motion';
import {
  Stethoscope,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  Heart,
  BriefcaseMedical,
  FileText,
  Receipt,
  Layers,
  TrendingUp,
  MapPin,
  Settings,
  Menu,
} from 'lucide-react';

export type MockupVariant = 'overview' | 'consult' | 'billing' | 'inventory';

const NAV_ITEMS = [
  { icon: LayoutDashboard, label: 'Dashboard' },
  { icon: Calendar, label: 'Appointments' },
  { icon: ClipboardList, label: 'Walk-ins' },
  { icon: Users, label: 'Customers' },
  { icon: Heart, label: 'Pets' },
  { icon: BriefcaseMedical, label: 'Doctors' },
  { icon: FileText, label: 'Prescriptions' },
  { icon: Receipt, label: 'Invoices' },
  { icon: Layers, label: 'Inventory' },
];

const VARIANT_ACTIVE_NAV: Record<MockupVariant, string> = {
  overview: 'Dashboard',
  consult: 'Doctors',
  billing: 'Invoices',
  inventory: 'Inventory',
};

const VARIANT_URL: Record<MockupVariant, string> = {
  overview: 'app.clinixdev.com/dashboard',
  consult: 'app.clinixdev.com/dashboard/doctors',
  billing: 'app.clinixdev.com/dashboard/invoices',
  inventory: 'app.clinixdev.com/dashboard/inventory',
};

const CLINIC_LABEL = 'VetCare Center · Downtown Clinic';

function MiniBarChart({ heights }: { heights: number[] }) {
  return (
    <div className="flex items-end gap-1 h-12">
      {heights.map((h, i) => (
        <div
          key={i}
          className="flex-1 rounded-sm bg-gradient-to-t from-primary/40 to-primary/80"
          style={{ height: `${h}%` }}
        />
      ))}
    </div>
  );
}

function OverviewContent() {
  return (
    <div className="space-y-3">
      <div className="grid grid-cols-4 gap-2">
        {[
          { label: 'Appointments', value: '2', color: 'text-primary' },
          { label: 'Walk-ins', value: '2', color: 'text-secondary' },
          { label: 'Checkout', value: '0', color: 'text-tertiary' },
          { label: 'Unpaid', value: '1', color: 'text-destructive' },
        ].map((k) => (
          <div key={k.label} className="rounded-lg bg-surface-container/60 border border-outline-variant/30 p-2">
            <p className="text-[8px] text-on-surface-variant/60 uppercase tracking-wide">{k.label}</p>
            <p className={`text-lg font-black ${k.color}`}>{k.value}</p>
          </div>
        ))}
      </div>
      <div className="rounded-lg bg-surface-container/40 border border-outline-variant/30 p-3">
        <p className="text-[9px] font-bold text-on-surface-variant/70 uppercase mb-2">Today&apos;s activity</p>
        <MiniBarChart heights={[45, 72, 58, 90, 65, 80, 55]} />
      </div>
      <div className="space-y-1.5">
        {[
          { pet: 'Max', owner: 'John Doe', status: 'consulting', color: 'bg-blue-500/20 text-blue-400' },
          { pet: 'Bella', owner: 'Jane Smith', status: 'waiting', color: 'bg-amber-500/20 text-amber-400' },
        ].map((v) => (
          <div key={v.pet} className="flex items-center justify-between rounded-lg bg-surface-container/30 px-2.5 py-1.5 border border-outline-variant/20">
            <div>
              <span className="text-[10px] font-bold text-on-surface">{v.pet}</span>
              <span className="text-[8px] text-on-surface-variant/50 ml-1.5">{v.owner}</span>
            </div>
            <span className={`text-[7px] font-bold px-1.5 py-0.5 rounded-full capitalize ${v.color}`}>{v.status}</span>
          </div>
        ))}
      </div>
    </div>
  );
}

function ConsultContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-center gap-2 rounded-lg bg-primary/10 border border-primary/20 p-2.5">
        <BriefcaseMedical className="w-4 h-4 text-primary shrink-0" />
        <div>
          <p className="text-[10px] font-bold text-on-surface">Max — Limping (right hind)</p>
          <p className="text-[8px] text-on-surface-variant/60">Owner: John Doe · Active consultation</p>
        </div>
      </div>
      <div className="grid grid-cols-2 gap-2">
        <div className="rounded-lg bg-surface-container/40 border border-outline-variant/30 p-2">
          <p className="text-[8px] text-on-surface-variant/60 uppercase">Vitals</p>
          <p className="text-[10px] font-semibold text-on-surface mt-1">Gait: favoring RH · Wt 28kg</p>
        </div>
        <div className="rounded-lg bg-surface-container/40 border border-outline-variant/30 p-2">
          <p className="text-[8px] text-on-surface-variant/60 uppercase">Assessment</p>
          <p className="text-[10px] font-semibold text-on-surface mt-1">Possible soft-tissue injury</p>
        </div>
      </div>
      <div className="rounded-lg bg-surface-container/40 border border-outline-variant/30 p-2.5">
        <p className="text-[8px] font-bold text-on-surface-variant/70 uppercase mb-1.5">Prescription</p>
        {['Carprofen 75mg daily', 'Rest & limited activity'].map((rx) => (
          <div key={rx} className="flex items-center gap-1.5 text-[9px] text-on-surface py-0.5">
            <FileText className="w-3 h-3 text-primary/70" />
            {rx}
          </div>
        ))}
      </div>
    </div>
  );
}

function BillingContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-on-surface">Invoice #INV-2026-0042</p>
        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-emerald-500/15 text-emerald-400">Paid</span>
      </div>
      <div className="rounded-lg bg-surface-container/40 border border-outline-variant/30 overflow-hidden">
        <table className="w-full text-[9px]">
          <thead>
            <tr className="bg-surface-container/60 text-on-surface-variant/60">
              <th className="text-left px-2 py-1.5 font-semibold">Item</th>
              <th className="text-right px-2 py-1.5 font-semibold">Qty</th>
              <th className="text-right px-2 py-1.5 font-semibold">Total</th>
            </tr>
          </thead>
          <tbody>
            {[
              { item: 'Consultation', qty: 1, total: '$45.00' },
              { item: 'Amoxicillin 250mg', qty: 2, total: '$28.00' },
              { item: 'Ear drops', qty: 1, total: '$18.50' },
            ].map((row) => (
              <tr key={row.item} className="border-t border-outline-variant/20">
                <td className="px-2 py-1.5 text-on-surface">{row.item}</td>
                <td className="px-2 py-1.5 text-right text-on-surface-variant">{row.qty}</td>
                <td className="px-2 py-1.5 text-right font-semibold text-on-surface">{row.total}</td>
              </tr>
            ))}
          </tbody>
        </table>
      </div>
      <div className="flex justify-between items-end border-t border-outline-variant/30 pt-2">
        <div className="text-[8px] text-on-surface-variant/60">Tax (10%) · $9.15</div>
        <div className="text-right">
          <p className="text-[8px] text-on-surface-variant/60">Total</p>
          <p className="text-base font-black text-primary">$100.65</p>
        </div>
      </div>
    </div>
  );
}

function InventoryContent() {
  return (
    <div className="space-y-3">
      <div className="flex items-center justify-between">
        <p className="text-[10px] font-bold text-on-surface">Stock catalog</p>
        <span className="text-[8px] font-bold px-2 py-0.5 rounded-full bg-amber-500/15 text-amber-400">2 low stock</span>
      </div>
      <div className="space-y-1.5">
        {[
          { name: 'Amoxicillin 250mg', stock: 48, level: 'ok' },
          { name: 'Rabies vaccine', stock: 6, level: 'low' },
          { name: 'Flea treatment', stock: 22, level: 'ok' },
          { name: 'Surgical gloves', stock: 3, level: 'low' },
        ].map((p) => (
          <div key={p.name} className="flex items-center justify-between rounded-lg bg-surface-container/30 px-2.5 py-1.5 border border-outline-variant/20">
            <span className="text-[9px] font-semibold text-on-surface">{p.name}</span>
            <span className={`text-[8px] font-bold ${p.level === 'low' ? 'text-amber-400' : 'text-on-surface-variant/60'}`}>
              {p.stock} units
            </span>
          </div>
        ))}
      </div>
      <MiniBarChart heights={[30, 55, 40, 70, 25, 60, 45]} />
    </div>
  );
}

const VARIANT_CONTENT: Record<MockupVariant, () => React.ReactNode> = {
  overview: OverviewContent,
  consult: ConsultContent,
  billing: BillingContent,
  inventory: InventoryContent,
};

const VARIANT_TITLES: Record<MockupVariant, string> = {
  overview: 'Clinic overview',
  consult: 'Consultation room',
  billing: 'Invoice & checkout',
  inventory: 'Inventory catalog',
};

function subscribeReducedMotion(cb: () => void) {
  const mq = window.matchMedia('(prefers-reduced-motion: reduce)');
  mq.addEventListener('change', cb);
  return () => mq.removeEventListener('change', cb);
}

function getReducedMotion() {
  return window.matchMedia('(prefers-reduced-motion: reduce)').matches;
}

interface DashboardMockupProps {
  variant?: MockupVariant;
  className?: string;
  enableTilt?: boolean;
}

export default function DashboardMockup({
  variant = 'overview',
  className = '',
  enableTilt = true,
}: DashboardMockupProps) {
  const ref = useRef<HTMLDivElement>(null);
  const reduceMotion = useSyncExternalStore(subscribeReducedMotion, getReducedMotion, () => false);

  const mouseX = useMotionValue(0);
  const mouseY = useMotionValue(0);
  const springX = useSpring(mouseX, { stiffness: 150, damping: 20 });
  const springY = useSpring(mouseY, { stiffness: 150, damping: 20 });
  const rotateX = useTransform(springY, [-0.5, 0.5], [6, -6]);
  const rotateY = useTransform(springX, [-0.5, 0.5], [-6, 6]);

  const handleMouseMove = (e: React.MouseEvent<HTMLDivElement>) => {
    if (!enableTilt || reduceMotion || !ref.current) return;
    const rect = ref.current.getBoundingClientRect();
    mouseX.set((e.clientX - rect.left) / rect.width - 0.5);
    mouseY.set((e.clientY - rect.top) / rect.height - 0.5);
  };

  const handleMouseLeave = () => {
    mouseX.set(0);
    mouseY.set(0);
  };

  const Content = VARIANT_CONTENT[variant];

  return (
    <motion.div
      ref={ref}
      onMouseMove={handleMouseMove}
      onMouseLeave={handleMouseLeave}
      style={
        enableTilt && !reduceMotion
          ? { rotateX, rotateY, transformPerspective: 1200 }
          : undefined
      }
      className={`perspective-frame ${className}`}
    >
      <div className="rounded-2xl overflow-hidden border border-outline-variant/50 shadow-premium bg-surface-container glow-border">
        {/* Browser chrome */}
        <div className="flex items-center gap-2 px-3 py-2 bg-surface-container-high border-b border-outline-variant/40">
          <div className="flex gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-destructive/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-tertiary/60" />
            <span className="w-2.5 h-2.5 rounded-full bg-emerald-500/60" />
          </div>
          <div className="flex-1 mx-2">
            <div className="bg-surface/60 rounded-md px-3 py-0.5 text-[9px] text-on-surface-variant/50 text-center font-mono truncate">
              {VARIANT_URL[variant]}
            </div>
          </div>
        </div>

        <div className="flex min-h-[220px]">
          {/* Sidebar */}
          <div className="hidden sm:flex w-28 shrink-0 flex-col border-r border-outline-variant/30 bg-surface-container/80 py-2">
            <div className="flex items-center gap-1.5 px-2 mb-2">
              <div className="w-5 h-5 bg-primary/20 rounded-md flex items-center justify-center">
                <Stethoscope className="w-3 h-3 text-primary" />
              </div>
              <span className="text-[8px] font-black text-on-surface truncate">ClinixDev</span>
            </div>
            <nav className="flex-1 space-y-0.5 px-1">
              {NAV_ITEMS.slice(0, 8).map((item) => (
                <div
                  key={item.label}
                  className={`flex items-center gap-1.5 px-1.5 py-1 rounded-md text-[7px] font-semibold ${
                    item.label === VARIANT_ACTIVE_NAV[variant]
                      ? 'bg-primary/15 text-primary'
                      : 'text-on-surface-variant/50'
                  }`}
                >
                  <item.icon className="w-3 h-3 shrink-0" />
                  <span className="truncate">{item.label}</span>
                </div>
              ))}
            </nav>
          </div>

          {/* Main content */}
          <div className="flex-1 p-3 min-w-0">
            <div className="flex items-center justify-between mb-2">
              <div>
                <p className="text-[10px] font-black text-on-surface">{VARIANT_TITLES[variant]}</p>
                <p className="text-[8px] text-on-surface-variant/50">{CLINIC_LABEL}</p>
              </div>
              <div className="flex items-center gap-1.5">
                <TrendingUp className="w-3 h-3 text-on-surface-variant/40 hidden sm:block" />
                <MapPin className="w-3 h-3 text-on-surface-variant/40 hidden sm:block" />
                <Settings className="w-3 h-3 text-on-surface-variant/40 hidden sm:block" />
                <Menu className="w-3 h-3 text-on-surface-variant/40 sm:hidden" />
              </div>
            </div>
            <Content />
          </div>
        </div>
      </div>
    </motion.div>
  );
}
