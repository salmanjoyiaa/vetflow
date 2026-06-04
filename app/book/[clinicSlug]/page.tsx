import { createAdminClient } from '@/lib/supabase/server';
import PublicBookingFormClient from '@/components/forms/PublicBookingFormClient';
import { Stethoscope } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Online Booking Portal',
  description: 'Request a veterinary consultation or clinic check-up.',
};

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const adminClient = await createAdminClient();

  // 1. Resolve clinic organization by slug
  const { data: org, error } = await adminClient
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', clinicSlug)
    .single();

  if (error || !org) {
    return (
      <main className="min-h-screen mesh-gradient flex items-center justify-center p-4">
        <div className="glass-panel p-8 text-center max-w-sm">
          <Stethoscope className="w-10 h-10 text-destructive mx-auto mb-4" />
          <h2 className="text-base font-bold text-on-surface mb-1">Clinic Not Found</h2>
          <p className="text-xs text-on-surface-variant">
            The requested veterinary clinic address is not registered on the VetFlow network.
          </p>
        </div>
      </main>
    );
  }

  // 2. Fetch active branches for this clinic
  const { data: branches } = await adminClient
    .from('branches')
    .select('id, name, address')
    .eq('organization_id', org.id)
    .eq('is_active', true);

  return (
    <main className="min-h-screen mesh-gradient flex items-center justify-center p-4 md:py-16">
      <div className="w-full max-w-xl glass-panel p-8 md:p-10">
        <div className="flex flex-col items-center mb-8 text-center">
          <div className="w-12 h-12 bg-primary/15 flex items-center justify-center rounded-2xl mb-3">
            <Stethoscope className="w-6 h-6 text-primary" />
          </div>
          <span className="text-[10px] font-black text-primary uppercase tracking-wider">Online Booking Request</span>
          <h1 className="text-xl font-black text-on-surface mt-1">{org.name}</h1>
          <p className="text-xs text-on-surface-variant mt-1 max-w-xs leading-relaxed">
            Fill in your contact and pet details below. Attending branch staff will confirm your slot via email shortly.
          </p>
        </div>

        {/* BOOKING CLIENT FORM */}
        <PublicBookingFormClient 
          orgSlug={org.slug} 
          branches={branches || []} 
        />

      </div>
    </main>
  );
}
