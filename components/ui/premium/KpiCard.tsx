import type { LucideIcon } from 'lucide-react';
import { cn } from '@/lib/utils';

interface KpiCardProps {
  label: string;
  value: string | number;
  icon: LucideIcon;
  trend?: string;
  className?: string;
}

export default function KpiCard({
  label,
  value,
  icon: Icon,
  trend,
  className,
}: KpiCardProps) {
  return (
    <div className={cn('glass-panel p-5 flex flex-col gap-3', className)}>
      <div className="flex items-center justify-between">
        <span className="text-[10px] font-bold uppercase tracking-wider text-on-surface-variant">
          {label}
        </span>
        <div className="w-8 h-8 rounded-xl bg-primary/10 flex items-center justify-center">
          <Icon className="w-4 h-4 text-primary" />
        </div>
      </div>
      <p className="text-2xl font-bold text-on-surface font-[family-name:var(--font-display)]">
        {value}
      </p>
      {trend && (
        <p className="text-[10px] text-secondary font-semibold">{trend}</p>
      )}
    </div>
  );
}
