'use client';

import { useRef, useState } from 'react';
import { AnimatePresence, motion, useScroll, useTransform, useMotionValueEvent } from 'framer-motion';
import DashboardMockup, { type MockupVariant } from '@/components/landing/DashboardMockup';
import { Calendar, Stethoscope, Receipt, Boxes } from 'lucide-react';

/** Shared top clearance for fixed landing nav */
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

/** Compact layout for viewports below lg — no tall scroll track */
function CompactShowcase() {
  const [activeIndex, setActiveIndex] = useState(0);

  return (
    <section className="relative py-20 px-5 md:px-8 lg:hidden">
      <div className="absolute inset-0 grid-fade-bg pointer-events-none opacity-30" />
      <div className="relative max-w-6xl mx-auto space-y-10">
        <ShowcaseCopy activeIndex={activeIndex} onItemClick={setActiveIndex} />
        <div className="flex flex-wrap gap-2">
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
          >
            <DashboardMockup variant={SHOWCASE_ITEMS[activeIndex].variant} enableTilt />
          </motion.div>
        </AnimatePresence>
      </div>
    </section>
  );
}

/** Desktop sticky scroll-scrubbed showcase */
function StickyDesktopShowcase() {
  const containerRef = useRef<HTMLDivElement>(null);
  const [activeIndex, setActiveIndex] = useState(0);
  const stepVh = 32;

  const { scrollYProgress } = useScroll({
    target: containerRef,
    offset: ['start start', 'end end'],
  });

  const mockupScale = useTransform(scrollYProgress, [0, 0.15, 0.85, 1], [0.94, 1, 1, 0.96]);
  const mockupOpacity = useTransform(scrollYProgress, [0, 0.08, 0.92, 1], [0.85, 1, 1, 0.85]);

  useMotionValueEvent(scrollYProgress, 'change', (v) => {
    const idx = Math.min(
      SHOWCASE_ITEMS.length - 1,
      Math.max(0, Math.floor(v * SHOWCASE_ITEMS.length))
    );
    setActiveIndex(idx);
  });

  const handleItemClick = (idx: number) => {
    if (!containerRef.current) return;
    const elementTop = containerRef.current.offsetTop;
    const scrollRange = containerRef.current.offsetHeight - window.innerHeight;
    const targetProgress = (idx + 0.5) / SHOWCASE_ITEMS.length;
    const targetScrollY = elementTop + targetProgress * scrollRange;

    window.scrollTo({
      top: targetScrollY,
      behavior: 'smooth',
    });
  };

  return (
    <section
      ref={containerRef}
      className="relative hidden lg:block sticky-showcase-container"
      style={{ height: `${SHOWCASE_ITEMS.length * stepVh}vh` }}
    >
      <div className="sticky top-[var(--landing-nav-height)] h-[80vh] flex items-center overflow-hidden w-full">
        <div className="absolute inset-0 grid-fade-bg pointer-events-none opacity-40" />
        <div className="relative max-w-6xl mx-auto px-5 md:px-8 w-full grid grid-cols-2 gap-12 xl:gap-16 items-center">
          <ShowcaseCopy activeIndex={activeIndex} onItemClick={handleItemClick} />

          <motion.div style={{ scale: mockupScale, opacity: mockupOpacity }} className="relative">
            <div className="absolute -inset-8 bg-primary/10 rounded-3xl blur-3xl pointer-events-none" />
            <AnimatePresence mode="wait">
              <motion.div
                key={SHOWCASE_ITEMS[activeIndex].variant}
                initial={{ opacity: 0, y: 12 }}
                animate={{ opacity: 1, y: 0 }}
                exit={{ opacity: 0, y: -12 }}
                transition={{ duration: 0.35, ease: [0.16, 1, 0.3, 1] }}
              >
                <DashboardMockup
                  variant={SHOWCASE_ITEMS[activeIndex].variant}
                  enableTilt
                  className="relative"
                />
              </motion.div>
            </AnimatePresence>
          </motion.div>
        </div>
      </div>
    </section>
  );
}

export default function StickyShowcase() {
  return (
    <>
      <CompactShowcase />
      <StickyDesktopShowcase />
    </>
  );
}
