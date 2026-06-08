'use client';

import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { Layers, Camera } from 'lucide-react';

interface InventoryTabsClientProps {
  initialTab: 'catalog' | 'intake';
}

export default function InventoryTabsClient({ initialTab }: InventoryTabsClientProps) {
  const pathname = usePathname();

  return (
    <div className="flex gap-2">
      <Link
        href={pathname}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
          initialTab === 'catalog'
            ? 'bg-primary text-white'
            : 'bg-surface-container border border-outline-variant text-on-surface-variant'
        }`}
      >
        <Layers className="w-3.5 h-3.5" />
        Catalog
      </Link>
      <Link
        href={`${pathname}?tab=intake`}
        className={`inline-flex items-center gap-1.5 px-4 py-2 rounded-xl text-xs font-bold transition-colors ${
          initialTab === 'intake'
            ? 'bg-primary text-white'
            : 'bg-surface-container border border-outline-variant text-on-surface-variant'
        }`}
      >
        <Camera className="w-3.5 h-3.5" />
        Scan supplier invoice
      </Link>
    </div>
  );
}
