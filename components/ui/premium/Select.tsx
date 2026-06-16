'use client';

import { useEffect, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';
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
  onAddNew?: () => void;
  addNewLabel?: string;
  size?: 'default' | 'compact';
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
  onAddNew,
  addNewLabel = 'Add new…',
  size = 'default',
}: SelectProps) {
  const [open, setOpen] = useState(false);
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const isCompact = size === 'compact';

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

  const handleAddNew = () => {
    setOpen(false);
    onAddNew?.();
  };

  return (
    <div className={cn('space-y-1.5', className)}>
      {name && <input type="hidden" name={name} value={value} readOnly />}
      {label && (
        <label
          htmlFor={id}
          className={cn(
            'block font-semibold text-on-surface-variant uppercase tracking-wider',
            isCompact ? 'text-[9px]' : 'text-[10px]'
          )}
        >
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
          'w-full bg-surface-container border border-outline-variant rounded-2xl outline-none text-on-surface',
          'flex items-center justify-between gap-2 text-left transition-colors',
          'focus:border-primary focus:ring-1 focus:ring-primary',
          'disabled:opacity-50 disabled:cursor-not-allowed',
          isCompact ? 'px-2 py-1 text-[10px] rounded-xl' : 'px-4 py-3 text-sm',
          error && 'border-destructive'
        )}
        aria-haspopup="listbox"
        aria-expanded={open}
      >
        <span className={cn('truncate', !selected && 'text-on-surface-variant')}>
          {selected?.label ?? placeholder}
        </span>
        <ChevronDown
          className={cn(
            'shrink-0 text-on-surface-variant transition-transform',
            isCompact ? 'w-3 h-3' : 'w-4 h-4',
            open && 'rotate-180'
          )}
        />
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
                    'w-full text-left flex items-center justify-between gap-2 transition-colors',
                    isCompact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2.5 text-xs',
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
            {onAddNew && (
              <button
                type="button"
                onClick={handleAddNew}
                className={cn(
                  'w-full flex items-center gap-2 text-primary hover:bg-primary/5 font-semibold border-t border-outline-variant/40',
                  isCompact ? 'px-2 py-1.5 text-[10px]' : 'px-3 py-2.5 text-xs'
                )}
              >
                <Plus className="w-3.5 h-3.5" />
                {addNewLabel}
              </button>
            )}
          </div>,
          document.body
        )}
    </div>
  );
}
