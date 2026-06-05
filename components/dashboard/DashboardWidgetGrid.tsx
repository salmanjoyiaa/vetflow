import Link from 'next/link';
import KpiCard from '@/components/ui/premium/KpiCard';
import type { LucideIcon } from 'lucide-react';
import { ArrowRight } from 'lucide-react';

export type DashboardKpi = {
  key: string;
  label: string;
  value: number | string;
  icon: LucideIcon;
  href?: string;
  trend?: string;
};

interface DashboardWidgetGridProps {
  kpis: DashboardKpi[];
  columns?: 2 | 3 | 4;
}

export default function DashboardWidgetGrid({
  kpis,
  columns = 4,
}: DashboardWidgetGridProps) {
  const colClass =
    columns === 2
      ? 'grid-cols-2'
      : columns === 3
        ? 'grid-cols-2 lg:grid-cols-3'
        : 'grid-cols-2 lg:grid-cols-4';

  return (
    <div className={`grid ${colClass} gap-4 md:gap-6`}>
      {kpis.map((kpi) => {
        const card = (
          <KpiCard
            label={kpi.label}
            value={kpi.value}
            icon={kpi.icon}
            trend={kpi.trend}
            className={kpi.href ? 'hover:border-primary/30 transition-colors' : undefined}
          />
        );

        if (!kpi.href) {
          return <div key={kpi.key}>{card}</div>;
        }

        return (
          <Link key={kpi.key} href={kpi.href} className="group relative block">
            {card}
            <ArrowRight className="absolute top-5 right-5 w-4 h-4 text-on-surface-variant/20 group-hover:text-primary transition-colors" />
          </Link>
        );
      })}
    </div>
  );
}
