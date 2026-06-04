import { ShieldX } from 'lucide-react';

interface DeniedStateProps {
  title?: string;
  message?: string;
}

export default function DeniedState({
  title = 'Access denied',
  message = 'You do not have permission to view this page.',
}: DeniedStateProps) {
  return (
    <div className="glass-panel border-destructive/20 p-8 rounded-2xl flex gap-4 items-start">
      <div className="w-10 h-10 rounded-xl bg-destructive/10 flex items-center justify-center shrink-0">
        <ShieldX className="w-5 h-5 text-destructive" />
      </div>
      <div>
        <h2 className="text-sm font-bold text-on-surface">{title}</h2>
        <p className="text-xs text-on-surface-variant mt-1">{message}</p>
      </div>
    </div>
  );
}
