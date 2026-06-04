import { redirect } from 'next/navigation';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import DeniedState from '@/components/ui/premium/DeniedState';
import { createClient } from '@/lib/supabase/server';
import BranchForm from '@/components/forms/BranchForm';
import BranchListClient from '@/components/dashboard/BranchListClient';
import { MapPin } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Branch Administration',
  description: 'Manage branches of your veterinary organization.',
};

export default async function BranchesPage() {
  // 1. Authenticate user & check admin role
  const ctx = await resolveServerAuthContext();

  if (!ctx) {
    redirect('/login');
  }

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
      
      {/* PAGE HEADER */}
      <div className="flex flex-col sm:flex-row sm:items-center sm:justify-between gap-4">
        <div>
          <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
            <MapPin className="w-5 h-5 text-primary" />
            Branches
          </h2>
          <p className="text-xs text-on-surface-variant/70 mt-1">
            Create, active/deactivate, and inspect local branch locations.
          </p>
        </div>

        <BranchForm />
      </div>

      {/* BRANCH MATRIX */}
      <BranchListClient initialBranches={branches || []} />

    </div>
  );
}

