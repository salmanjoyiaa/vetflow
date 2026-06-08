import { cn } from '@/lib/utils';
import { tableHeadClass, tableRowClass } from '@/lib/ui/dashboard-classes';
import type { ReactNode } from 'react';

interface DataTableProps {
  children: ReactNode;
  className?: string;
}

export function DataTable({ children, className }: DataTableProps) {
  return (
    <div className={cn('glass-panel rounded-2xl overflow-hidden border border-outline-variant/40', className)}>
      <div className="overflow-x-auto">
        <table className="w-full text-left text-sm">{children}</table>
      </div>
    </div>
  );
}

export function DataTableHead({ children }: { children: ReactNode }) {
  return <thead className={tableHeadClass}>{children}</thead>;
}

export function DataTableRow({ children, className }: { children: ReactNode; className?: string }) {
  return <tr className={cn(tableRowClass, className)}>{children}</tr>;
}

export function DataTableCell({
  children,
  className,
  header,
}: {
  children: ReactNode;
  className?: string;
  header?: boolean;
}) {
  const Tag = header ? 'th' : 'td';
  return (
    <Tag className={cn('px-4 py-3 text-xs', header && 'font-bold', className)}>{children}</Tag>
  );
}
