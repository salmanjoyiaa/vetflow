'use client';

import { useEffect, useRef } from 'react';
import { animate, useInView, useMotionValue, useMotionValueEvent } from 'framer-motion';

interface StatCounterProps {
  value: number;
  suffix?: string;
  prefix?: string;
  label: string;
  duration?: number;
}

export default function StatCounter({
  value,
  suffix = '',
  prefix = '',
  label,
  duration = 1.4,
}: StatCounterProps) {
  const ref = useRef<HTMLDivElement>(null);
  const numberRef = useRef<HTMLSpanElement>(null);
  const isInView = useInView(ref, { once: true, margin: '-40px' });
  const motionValue = useMotionValue(0);

  useMotionValueEvent(motionValue, 'change', (v) => {
    if (numberRef.current) numberRef.current.textContent = String(Math.round(v));
  });

  useEffect(() => {
    if (!isInView) return;
    const reduceMotion = window.matchMedia('(prefers-reduced-motion: reduce)').matches;
    const controls = animate(motionValue, value, {
      duration: reduceMotion ? 0 : duration,
      ease: [0.16, 1, 0.3, 1],
    });
    return () => controls.stop();
  }, [isInView, value, duration, motionValue]);

  return (
    <div ref={ref} className="text-center">
      <p className="text-2xl md:text-3xl font-black text-on-surface tabular-nums animate-count-pop">
        {prefix}
        <span ref={numberRef}>0</span>
        {suffix}
      </p>
      <p className="text-[10px] font-semibold text-on-surface-variant/60 uppercase tracking-wider mt-1">
        {label}
      </p>
    </div>
  );
}
