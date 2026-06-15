'use client';

import { useRouter } from 'next/navigation';
import type { LucideIcon } from 'lucide-react';
import type { QabItem } from '@/components/dashboard/role-qab-config';

interface RoleQuickActionsGridProps {
  items: QabItem[];
  onAction: (item: QabItem) => void;
}

export default function RoleQuickActionsGrid({ items, onAction }: RoleQuickActionsGridProps) {
  if (items.length === 0) return null;

  return (
    <div className="space-y-3">
      <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
        Quick Actions
      </h3>
      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-4 xl:grid-cols-5 gap-3">
        {items.map((item) => (
          <QabCard key={item.id} item={item} onClick={() => onAction(item)} />
        ))}
      </div>
    </div>
  );
}

function QabCard({ item, onClick }: { item: QabItem; onClick: () => void }) {
  const Icon = item.icon;
  return (
    <button
      type="button"
      onClick={onClick}
      className="group text-left p-4 rounded-2xl border border-sky-500/25 bg-sky-500/10 hover:bg-sky-500/20 hover:border-sky-500/40 transition-all shadow-sm"
    >
      <div className="w-9 h-9 rounded-xl bg-sky-500/20 flex items-center justify-center mb-3 group-hover:bg-sky-500/30 transition-colors">
        <Icon className="w-4.5 h-4.5 text-sky-300" />
      </div>
      <span className="text-xs font-bold text-on-surface block leading-tight">{item.label}</span>
      <span className="text-[10px] text-on-surface-variant/70 block mt-0.5 line-clamp-2">
        {item.description}
      </span>
    </button>
  );
}

export function useQabNavigation() {
  const router = useRouter();
  return (item: QabItem, openModal: (id: string) => void) => {
    if (item.launcher === 'page' && item.href) {
      router.push(item.href);
      return;
    }
    if (item.modalId) {
      openModal(item.modalId);
    }
  };
}
