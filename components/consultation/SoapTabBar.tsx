'use client';

import { Lock } from 'lucide-react';

export type SoapTab = 'S' | 'O' | 'A' | 'P' | 'D' | 'Rx';

const TABS: { id: SoapTab; label: string; title: string }[] = [
  { id: 'S', label: 'S', title: 'Subjective' },
  { id: 'O', label: 'O', title: 'Objective' },
  { id: 'A', label: 'A', title: 'Assessment' },
  { id: 'P', label: 'P', title: 'Plan' },
  { id: 'D', label: 'D', title: 'Diagnostics' },
  { id: 'Rx', label: 'Rx', title: 'Prescription' },
];

interface SoapTabBarProps {
  active: SoapTab;
  onChange: (tab: SoapTab) => void;
  completed?: Partial<Record<SoapTab, boolean>>;
  maxUnlockedIndex?: number;
  draftSaved?: boolean;
}

export function SoapTabBar({
  active,
  onChange,
  completed = {},
  maxUnlockedIndex = SOAP_TAB_ORDER.length - 1,
  draftSaved = false,
}: SoapTabBarProps) {
  return (
    <div className="space-y-2">
      <div className="flex items-center gap-1 p-1 glass-panel rounded-xl border border-outline-variant/40 shadow-sm overflow-x-auto">
        {TABS.map((tab, index) => {
          const isActive = active === tab.id;
          const done = completed[tab.id];
          const locked = index > maxUnlockedIndex;
          return (
            <button
              key={tab.id}
              type="button"
              onClick={() => !locked && onChange(tab.id)}
              disabled={locked}
              title={locked ? `${tab.title} — complete previous sections first` : tab.title}
              className={`relative min-w-[2.75rem] px-3 py-2.5 rounded-lg text-xs font-black transition-all ${
                isActive
                  ? 'bg-primary text-white shadow-sm'
                  : locked
                    ? 'text-on-surface-variant/30 cursor-not-allowed'
                    : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container/50'
              }`}
            >
              {locked ? <Lock className="w-3 h-3 mx-auto" /> : tab.label}
              {done && !isActive && !locked && (
                <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-surface" />
              )}
            </button>
          );
        })}
      </div>
      {draftSaved && (
        <p className="text-[10px] text-emerald-500 font-semibold">Draft saved</p>
      )}
    </div>
  );
}

export const SOAP_TAB_ORDER: SoapTab[] = ['S', 'O', 'A', 'P', 'D', 'Rx'];

export function getSoapTabTitle(tab: SoapTab): string {
  return TABS.find((t) => t.id === tab)?.title ?? tab;
}
