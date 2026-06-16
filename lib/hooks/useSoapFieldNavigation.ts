'use client';

import { useCallback, type KeyboardEvent } from 'react';
import type { SoapTab } from '@/components/consultation/SoapTabBar';

function isFieldEmpty(el: HTMLElement): boolean {
  if (el instanceof HTMLInputElement) {
    if (el.type === 'number') return el.value === '' || Number.isNaN(Number(el.value));
    return el.value.trim() === '';
  }
  if (el instanceof HTMLTextAreaElement) return el.value.trim() === '';
  return false;
}

export function useSoapFieldNavigation(
  activeTab: SoapTab,
  onAdvanceTab: () => void | Promise<void>
) {
  const handleFormKeyDown = useCallback(
    (e: KeyboardEvent<HTMLFormElement>) => {
      if (e.key !== 'Enter') return;
      const target = e.target as HTMLElement;
      if (target instanceof HTMLTextAreaElement && !e.ctrlKey) return;
      if (target instanceof HTMLButtonElement || target.closest('button')) return;

      const fields = Array.from(
        document.querySelectorAll<HTMLElement>(`[data-soap-tab="${activeTab}"][data-soap-field]`)
      ).filter((el) => !el.hasAttribute('disabled') && el.offsetParent !== null);

      if (fields.length === 0) return;

      const currentIdx = fields.findIndex((el) => el === target || el.contains(target));
      const startIdx = currentIdx >= 0 ? currentIdx + 1 : 0;

      for (let i = startIdx; i < fields.length; i++) {
        if (isFieldEmpty(fields[i])) {
          e.preventDefault();
          const el = fields[i];
          el.focus();
          if (el instanceof HTMLInputElement || el instanceof HTMLTextAreaElement) {
            el.select();
          }
          return;
        }
      }

      for (let i = 0; i < (currentIdx >= 0 ? currentIdx : fields.length); i++) {
        if (isFieldEmpty(fields[i])) {
          e.preventDefault();
          fields[i].focus();
          return;
        }
      }

      e.preventDefault();
      void onAdvanceTab();
    },
    [activeTab, onAdvanceTab]
  );

  return { handleFormKeyDown };
}
