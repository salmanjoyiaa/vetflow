'use client';

import { useEffect, useMemo, useRef, useState } from 'react';
import { createPortal } from 'react-dom';
import { ChevronDown, Check, Plus } from 'lucide-react';
import { cn } from '@/lib/utils';

export type CreatableOption = { value: string; label: string };

interface CreatableSelectProps {
  label?: string;
  error?: string;
  id?: string;
  value?: string;
  onChange?: (value: string) => void;
  options?: CreatableOption[];
  placeholder?: string;
  disabled?: boolean;
  className?: string;
  allowCreate?: boolean;
  onCreateOption?: (label: string) => void | Promise<void>;
  createLabel?: (query: string) => string;
}

export default function CreatableSelect({
  label,
  error,
  id,
  value = '',
  onChange,
  options = [],
  placeholder = 'Select or type…',
  disabled,
  className,
  allowCreate = true,
  onCreateOption,
  createLabel = (q) => `Create "${q}"`,
}: CreatableSelectProps) {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState('');
  const [pos, setPos] = useState({ top: 0, left: 0, width: 0 });
  const triggerRef = useRef<HTMLButtonElement>(null);
  const listRef = useRef<HTMLDivElement>(null);

  const selected = options.find((o) => o.value === value);
  const displayLabel = selected?.label || value || placeholder;

  const filtered = useMemo(() => {
    const q = query.trim().toLowerCase();
    if (!q) return options;
    return options.filter(
      (o) => o.label.toLowerCase().includes(q) || o.value.toLowerCase().includes(q)
    );
  }, [options, query]);

  const canCreate =
    allowCreate &&
    query.trim().length > 0 &&
    !options.some((o) => o.label.toLowerCase() === query.trim().toLowerCase());

  useEffect(() => {
    if (!open || !triggerRef.current) return;
    const rect = triggerRef.current.getBoundingClientRect();
    setPos({ top: rect.bottom + 4, left: rect.left, width: rect.width });
  }, [open, query]);

  useEffect(() => {
    if (!open) return;
    const onDoc = (e: MouseEvent) => {
      const t = e.target as Node;
      if (triggerRef.current?.contains(t) || listRef.current?.contains(t)) return;
      setOpen(false);
      setQuery('');
    };
    const onKey = (e: KeyboardEvent) => {
      if (e.key === 'Escape') {
        setOpen(false);
        setQuery('');
      }
    };
    document.addEventListener('mousedown', onDoc);
    document.addEventListener('keydown', onKey);
    return () => {
      document.removeEventListener('mousedown', onDoc);
      document.removeEventListener('keydown', onKey);
    };
  }, [open]);

  const pick = (v: string, labelText?: string) => {
    onChange?.(v);
    setQuery(labelText || v);
    setOpen(false);
  };

  const handleCreate = async () => {
    const labelText = query.trim();
    if (!labelText) return;
    if (onCreateOption) {
      await onCreateOption(labelText);
    }
    pick(labelText, labelText);
  };

  return (
    <div className={cn('space-y-1.5', className)}>
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
        onClick={() => setOpen((o) => !o)}
        className={cn(
          'w-full flex items-center justify-between gap-2 px-3 py-2 rounded-xl border text-xs text-left transition-colors',
          'bg-surface-container/30 border-outline-variant hover:border-primary/40',
          disabled && 'opacity-50 cursor-not-allowed',
          error && 'border-destructive/50'
        )}
      >
        <span className={cn('truncate', !value && 'text-on-surface-variant')}>{displayLabel}</span>
        <ChevronDown className={cn('w-3.5 h-3.5 shrink-0 transition-transform', open && 'rotate-180')} />
      </button>
      {error && <p className="text-[10px] text-destructive">{error}</p>}

      {open &&
        createPortal(
          <div
            ref={listRef}
            style={{ position: 'fixed', top: pos.top, left: pos.left, width: pos.width, zIndex: 9999 }}
            className="rounded-xl border border-outline-variant bg-surface shadow-premium overflow-hidden"
          >
            <div className="p-2 border-b border-outline-variant/40">
              <input
                autoFocus
                value={query}
                onChange={(e) => setQuery(e.target.value)}
                placeholder="Search or type new…"
                className="w-full px-2 py-1.5 text-xs bg-surface-container/40 border border-outline-variant rounded-lg outline-none focus:border-primary"
              />
            </div>
            <div className="max-h-48 overflow-y-auto py-1">
              {filtered.map((o) => (
                <button
                  key={o.value}
                  type="button"
                  onClick={() => pick(o.value, o.label)}
                  className="w-full flex items-center justify-between px-3 py-2 text-xs hover:bg-primary/5 text-on-surface"
                >
                  <span>{o.label}</span>
                  {value === o.value && <Check className="w-3.5 h-3.5 text-primary" />}
                </button>
              ))}
              {canCreate && (
                <button
                  type="button"
                  onClick={handleCreate}
                  className="w-full flex items-center gap-2 px-3 py-2 text-xs text-primary hover:bg-primary/5 font-semibold border-t border-outline-variant/30"
                >
                  <Plus className="w-3.5 h-3.5" />
                  {createLabel(query.trim())}
                </button>
              )}
              {filtered.length === 0 && !canCreate && (
                <p className="px-3 py-4 text-xs text-on-surface-variant text-center">No matches</p>
              )}
            </div>
          </div>,
          document.body
        )}
    </div>
  );
}
