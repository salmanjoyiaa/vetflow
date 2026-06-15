import { redirect } from 'next/navigation';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import PageHeader from '@/components/ui/premium/PageHeader';
import BenchmarkingClient from '@/components/dashboard/BenchmarkingClient';
import DeniedState from '@/components/ui/premium/DeniedState';
import { createClient } from '@/lib/supabase/server';
import { isClinicBenchmarkingEnabled } from '@/lib/auth/features';
import { BarChart3 } from 'lucide-react';

export const metadata = {
  title: 'Clinic Benchmarking',
  description: 'Compare branch performance across your organization.',
};

export default async function BenchmarkingPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/benchmarking');
  if (denied) return denied;

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from('subscription_status')
    .select('features')
    .eq('organization_id', ctx.organizationId || '')
    .maybeSingle();

  if (!isClinicBenchmarkingEnabled((sub?.features as Record<string, unknown>) || null)) {
    return (
      <DeniedState
        title="Benchmarking not enabled"
        message="Clinic benchmarking is an opt-in feature. Ask your platform administrator to enable it for your organization."
      />
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Clinic Benchmarking"
        description="Compare revenue, visit volume, and consult duration across branches. Enable via super-admin opt-in feature."
        icon={BarChart3}
      />
      <BenchmarkingClient />
    </div>
  );
}
