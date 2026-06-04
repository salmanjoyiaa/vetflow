import type { LucideIcon } from 'lucide-react';

interface EmptyStateProps {
  icon: LucideIcon;
  title: string;
  description?: string;
  action?: React.ReactNode;
}

export default function EmptyState({
  icon: Icon,
  title,
  description,
  action,
}: EmptyStateProps) {
  return (
    <div className="glass-panel p-12 text-center flex flex-col items-center">
      <Icon className="w-10 h-10 text-outline mb-4" />
      <h3 className="text-sm font-bold text-on-surface">{title}</h3>
      {description && (
        <p className="text-xs text-on-surface-variant mt-2 max-w-sm">{description}</p>
      )}
      {action && <div className="mt-6">{action}</div>}
    </div>
  );
}
