'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check } from 'lucide-react';
import { cn } from '@/lib/utils';

export type SelectOption = { value: string; label: string };

interface SelectProps {
  label?: string;
  error?: string;
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: SelectOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  /** @deprecated Use options prop — kept for simple native fallback */
  children?: React.ReactNode;
  name?: string;
}

export default function Select({
  label,
  error,
  id,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select…',
  disabled,
  className,
  name,
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [open]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') setOpen(false);
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (v: string) => {
    onChange?.(v);
    setOpen(false);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      {label && (
        <label htmlFor={id} className="block text-[10px] font-semibold text-on-surface-variant uppercase tracking-wider">
          {label}
        </label>
      )}
      <button
        ref={triggerRef}
        id={id}
        type="button"
        disabled={disabled}
        onClick={() => !disabled && setOpen((o) => !o)}
        className={cn(
          'w-full px-4 py-3 bg-surface-container border border-outline-variant rounded-2xl outline-none text-sm text-on-surface',
          'flex items-center justify-between gap-2 text-left transition-colors',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          error && 'border-destructive'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn('truncate', !selected && 'text-on-surface-variant')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown className={cn('w-4 h-4 shrink-0 text-on-surface-variant transition-transform', open && 'rotate-180')} />
      </button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {open &&
        typeof document !== 'undefined' &&
        createPortal(
          <div
            ref={listRef}
            role="listbox"
            className="fixed z-[200] max-h-56 overflow-y-auto rounded-xl border border-outline-variant/60 bg-surface-container-high shadow-premium py-1"
            style={{ top: pos.top, left: pos.left, width: pos.width }}
          >
            {options.map((opt) => {
              const active = opt.value === value;
              return (
                <button
                  key={opt.value || '__empty'}
                  type="button"
                  role="option"
                  aria-selected={active}
                  onClick={() => pick(opt.value)}
                  className={cn(
                    'w-full text-left px-3 py-2.5 text-xs flex items-center justify-between gap-2 transition-colors',
                    active
                      ? 'bg-primary/15 text-primary font-semibold'
                      : 'text-on-surface hover:bg-surface-container-highest'
                  )}
                >
                  <span className="truncate">{opt.label}</span>
                  {active && <Check className="w-3.5 h-3.5 shrink-0" />}
                </button>
              );
            })}
          </div>,
          document.body
        )}
    </div>
  );
}
