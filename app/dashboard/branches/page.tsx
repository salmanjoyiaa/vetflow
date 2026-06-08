import { redirect } from 'next/navigation';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import DeniedState from '@/components/ui/premium/DeniedState';
import { guardFeature } from '@/lib/auth/page-guards';
import { createClient } from '@/lib/supabase/server';
import BranchForm from '@/components/forms/BranchForm';
import BranchListClient from '@/components/dashboard/BranchListClient';
import PageHeader from '@/components/ui/premium/PageHeader';
import { MapPin } from 'lucide-react';

export const metadata = {
  title: 'Branch Administration',
  description: 'Manage branches of your veterinary organization.',
};

export default async function BranchesPage() {
  // 1. Authenticate user & check admin role
  const ctx = await resolveServerAuthContext();

  if (!ctx) {
    redirect('/login');
  }

  const featureDenied = guardFeature(ctx, 'multi_branch');
  if (featureDenied) return featureDenied;

  try {
    assertCapability(ctx, 'manage_branches');
  } catch {
    return (
      <DeniedState
        title="Branch administration restricted"
        message="Only clinic administrators can manage branches."
      />
    );
  }

  const session = ctx;

  // 2. Query branches
  const supabase = await createClient();
  const { data: branches, error } = await supabase
    .from('branches')
    .select('*')
    .eq('organization_id', session.organizationId)
    .order('created_at', { ascending: false });

  if (error) {
    return (
      <div className="bg-destructive/5 border border-destructive/20 text-destructive text-sm p-6 rounded-2xl">
        Failed to load branches: {error.message}
      </div>
    );
  }

  return (
    <div className="space-y-8">
      
      <PageHeader
        title="Branches"
        description="Create, active/deactivate, and inspect local branch locations."
        icon={MapPin}
        actions={<BranchForm />}
      />

      {/* BRANCH MATRIX */}
      <BranchListClient initialBranches={branches || []} />

    </div>
  );
}

