'use client';

import { useState } from 'react';
import { AnimatePresence, motion } from 'framer-motion';
import DashboardMockup, { type MockupVariant } from '@/components/landing/DashboardMockup';
import { Calendar, Stethoscope, Receipt, Boxes } from 'lucide-react';

/** Shared top clearance for fixed landing nav (nav bar + top margin) */
export const LANDING_NAV_OFFSET = 'pt-[var(--landing-nav-height)]';

const SHOWCASE_ITEMS: {
  variant: MockupVariant;
  icon: typeof Calendar;
  title: string;
  text: string;
}[] = [
  {
    variant: 'overview',
    icon: Calendar,
    title: 'One live queue',
    text: 'Appointments, walk-ins, and checkout — every front-desk action in a single calm overview.',
  },
  {
    variant: 'consult',
    icon: Stethoscope,
    title: 'Consultation room',
    text: 'Vitals, diagnoses, prescriptions, and lab orders — charted in one focused workspace.',
  },
  {
    variant: 'billing',
    icon: Receipt,
    title: 'Tax-aware billing',
    text: 'Branded invoices with line items, tax, and automatic thank-you emails on payment.',
  },
  {
    variant: 'inventory',
    icon: Boxes,
    title: 'Inventory that tracks itself',
    text: 'Stock levels update at checkout. Scan supplier invoices with AI-assisted intake.',
  },
];

function ShowcaseCopy({
  activeIndex,
  onItemClick,
}: {
  activeIndex: number;
  onItemClick?: (idx: number) => void;
}) {
  return (
    <div className="space-y-5">
      <span className="label-mono text-primary/80">See it in action</span>
      <h2 className="text-3xl md:text-4xl font-black tracking-tight leading-tight">
        Every workflow,
        <span className="block gradient-text">beautifully connected</span>
      </h2>
      <div className="space-y-3">
        {SHOWCASE_ITEMS.map((item, i) => (
          <motion.button
            key={item.variant}
            onClick={() => onItemClick?.(i)}
            type="button"
            animate={{
              opacity: activeIndex === i ? 1 : 0.55,
              x: activeIndex === i ? 0 : -6,
            }}
            transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
            className={`w-full text-left flex gap-3 p-3.5 rounded-2xl border transition-colors cursor-pointer hover:bg-primary/5 ${
              activeIndex === i
                ? 'border-primary/30 bg-primary/5'
                : 'border-transparent'
            }`}
          >
            <div
              className={`w-9 h-9 rounded-xl flex items-center justify-center shrink-0 ${
                activeIndex === i ? 'bg-primary/20' : 'bg-surface-container/60'
              }`}
            >
              <item.icon
                className={`w-4 h-4 ${activeIndex === i ? 'text-primary' : 'text-on-surface-variant/50'}`}
              />
            </div>
            <div>
              <p className="font-black text-sm">{item.title}</p>
              <p className="text-xs text-on-surface-variant/65 mt-0.5 leading-relaxed">{item.text}</p>
            </div>
          </motion.button>
        ))}
      </div>
    </div>
  );
}

function ShowcaseSection({ className = '' }: { className?: string }) {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className={`relative py-20 px-5 md:px-8 ${className}`}>
      <div className="absolute inset-0 grid-fade-bg pointer-events-none opacity-30" />
      <div className="relative max-w-6xl mx-auto space-y-10 lg:space-y-0 lg:grid lg:grid-cols-2 lg:gap-12 xl:gap-16 lg:items-center">
        <ShowcaseCopy activeIndex={activeIndex} onItemClick={setActiveIndex} />
        <div className="space-y-4">
          <div className="flex flex-wrap gap-2 lg:hidden">
            {SHOWCASE_ITEMS.map((item, i) => (
              <button
                key={item.variant}
                type="button"
                onClick={() => setActiveIndex(i)}
                className={`text-[10px] font-bold px-3 py-1.5 rounded-full border transition-all ${
                  activeIndex === i
                    ? 'bg-primary/15 text-primary border-primary/30'
                    : 'border-outline-variant/50 text-on-surface-variant'
                }`}
              >
                {item.title}
              </button>
            ))}
          </div>
          <AnimatePresence mode="wait">
            <motion.div
              key={SHOWCASE_ITEMS[activeIndex].variant}
              initial={{ opacity: 0, y: 10 }}
              animate={{ opacity: 1, y: 0 }}
              exit={{ opacity: 0, y: -10 }}
              transition={{ duration: 0.3 }}
              className="relative"
            >
              <div className="absolute -inset-8 bg-primary/10 rounded-3xl blur-3xl pointer-events-none hidden lg:block" />
              <DashboardMockup
                variant={SHOWCASE_ITEMS[activeIndex].variant}
                enableTilt
                className="relative"
              />
            </motion.div>
          </AnimatePresence>
        </div>
      </div>
    </section>
  );
}

export default function StickyShowcase() {
  return <ShowcaseSection />;
}
