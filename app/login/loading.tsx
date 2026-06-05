import AuthPageShell from '@/components/layout/AuthPageShell';
import { Loader2 } from 'lucide-react';

export default function LoginLoading() {
  return (
    <AuthPageShell
      title="Welcome back"
      subtitle="Trustworthy veterinary business platform"
    >
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-on-surface-variant">Loading sign in...</p>
      </div>
    </AuthPageShell>
  );
}
