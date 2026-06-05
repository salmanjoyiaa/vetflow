import AuthPageShell from '@/components/layout/AuthPageShell';
import { Loader2 } from 'lucide-react';

export default function AccountSetupLoading() {
  return (
    <AuthPageShell
      title="Account setup"
      subtitle="Trustworthy veterinary business platform"
    >
      <div className="flex flex-col items-center justify-center py-12 gap-3">
        <Loader2 className="w-8 h-8 text-primary animate-spin" />
        <p className="text-xs text-on-surface-variant">Checking your clinic access...</p>
      </div>
    </AuthPageShell>
  );
}
