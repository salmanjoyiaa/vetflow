'use client';

import { useEffect, useCallback, type ReactNode } from 'react';
import { createPortal } from 'react-dom';
import { X } from 'lucide-react';

interface FullScreenOverlayProps {
  open: boolean;
  onClose: () => void;
  breadcrumb?: ReactNode;
  children: ReactNode;
}

export default function FullScreenOverlay({
  open,
  onClose,
  breadcrumb,
  children,
}: FullScreenOverlayProps) {
  const handleKeyDown = useCallback(
    (e: KeyboardEvent) => {
      if (e.key === 'Escape') onClose();
    },
    [onClose]
  );

  useEffect(() => {
    if (!open) return;
    document.addEventListener('keydown', handleKeyDown);
    document.body.style.overflow = 'hidden';
    return () => {
      document.removeEventListener('keydown', handleKeyDown);
      document.body.style.overflow = '';
    };
  }, [open, handleKeyDown]);

  if (!open || typeof document === 'undefined') return null;

  return createPortal(
    <div
      className="fixed inset-0 z-[100] bg-black/60 backdrop-blur-sm flex flex-col"
      role="dialog"
      aria-modal="true"
    >
      <div className="shrink-0 flex items-center justify-between px-4 md:px-8 py-4 border-b border-outline-variant/30 bg-surface/90 backdrop-blur-xl">
        <div className="min-w-0 text-xs text-on-surface-variant font-semibold truncate">
          {breadcrumb}
        </div>
        <button
          type="button"
          onClick={onClose}
          className="p-2 rounded-lg hover:bg-surface-container text-on-surface-variant shrink-0"
          aria-label="Close"
        >
          <X className="w-5 h-5" />
        </button>
      </div>
      <div className="flex-1 overflow-y-auto">
        <div className="max-w-7xl mx-auto w-full px-4 md:px-8 py-6 md:py-8">{children}</div>
      </div>
    </div>,
    document.body
  );
}
