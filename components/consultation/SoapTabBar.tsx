'use client';

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
}

export function SoapTabBar({ active, onChange, completed = {} }: SoapTabBarProps) {
  return (
    <div className="flex items-center gap-1 p-1 glass-panel rounded-xl border border-outline-variant/40 shadow-sm overflow-x-auto">
      {TABS.map((tab) => {
        const isActive = active === tab.id;
        const done = completed[tab.id];
        return (
          <button
            key={tab.id}
            type="button"
            onClick={() => onChange(tab.id)}
            title={tab.title}
            className={`relative min-w-[2.75rem] px-3 py-2.5 rounded-lg text-xs font-black transition-all ${
              isActive
                ? 'bg-primary text-white shadow-sm'
                : 'text-on-surface-variant/60 hover:text-on-surface hover:bg-surface-container/50'
            }`}
          >
            {tab.label}
            {done && !isActive && (
              <span className="absolute -top-0.5 -right-0.5 w-2 h-2 rounded-full bg-emerald-500 border border-surface" />
            )}
          </button>
        );
      })}
    </div>
  );
}

export const SOAP_TAB_ORDER: SoapTab[] = ['S', 'O', 'A', 'P', 'D', 'Rx'];

export function getSoapTabTitle(tab: SoapTab): string {
  return TABS.find((t) => t.id === tab)?.title ?? tab;
}
