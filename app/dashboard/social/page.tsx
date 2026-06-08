import { redirect } from 'next/navigation';
import { cookies } from 'next/headers';
import { resolveServerAuthContext } from '@/lib/auth/context';
import { guardRoute } from '@/lib/auth/page-guards';
import PageHeader from '@/components/ui/premium/PageHeader';
import SocialAutomationClient from '@/components/social/SocialAutomationClient';
import { Share2 } from 'lucide-react';

export const metadata = {
  title: 'Social Automation',
  description: 'AI-assisted social media posts with Facebook and Instagram publishing.',
};

export default async function SocialAutomationPage({
  searchParams,
}: {
  searchParams: Promise<{
    connected?: string;
    error?: string;
    pickPage?: string;
    platform?: string;
    branchId?: string;
  }>;
}) {
  const params = await searchParams;
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const denied = guardRoute(ctx, '/dashboard/social');
  if (denied) return denied;

  const cookieStore = await cookies();
  const activeBranchCookie = cookieStore.get('clinix_branch_id')?.value;
  let activeBranchId = params.branchId || activeBranchCookie;
  if (!activeBranchId && ctx.branches.length > 0) {
    activeBranchId = ctx.branches[0].id;
  } else if (activeBranchId && !ctx.branches.some((b) => b.id === activeBranchId)) {
    activeBranchId = ctx.branches[0]?.id;
  }

  if (!activeBranchId) {
    return (
      <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-xs p-6 rounded-2xl">
        Assign a branch to use social automation.
      </div>
    );
  }

  return (
    <div className="space-y-8">
      <PageHeader
        title="Social Automation"
        description="Connect Facebook and Instagram per branch, compose with AI, and publish directly."
        icon={Share2}
      />
      <p className="text-xs text-on-surface-variant -mt-4">
        Requires a Facebook Page you manage. Instagram publishing also needs a linked Instagram Business account.
      </p>
      <SocialAutomationClient
        activeBranchId={activeBranchId}
        clinicName={ctx.organizationName || 'your clinic'}
        pickPageId={params.pickPage ?? null}
        flashConnected={params.connected ?? null}
        flashError={params.error ? decodeURIComponent(params.error) : null}
      />
    </div>
  );
}
