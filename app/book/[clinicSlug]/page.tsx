import { createAdminClient } from '@/lib/supabase/server';
import PublicBookingFormClient from '@/components/forms/PublicBookingFormClient';
import AuthPageShell from '@/components/layout/AuthPageShell';
import { Stethoscope } from 'lucide-react';

export const metadata = {
  title: 'Online Booking Portal',
  description: 'Request a veterinary consultation or clinic check-up.',
};

export default async function PublicBookingPage({
  params,
}: {
  params: Promise<{ clinicSlug: string }>;
}) {
  const { clinicSlug } = await params;
  const adminClient = await createAdminClient();

  const { data: org, error } = await adminClient
    .from('organizations')
    .select('id, name, slug')
    .eq('slug', clinicSlug)
    .single();

  if (error || !org) {
    return (
      <AuthPageShell
        title="Clinic"
        titleAccent="not found"
        subtitle="Trustworthy veterinary business platform"
        headerIcon={<Stethoscope className="w-10 h-10 text-destructive" />}
      >
        <p className="text-sm text-on-surface-variant/80 text-center leading-relaxed">
          The requested clinic address is not registered on the ClinixDev network.
        </p>
      </AuthPageShell>
    );
  }

  const { data: branches } = await adminClient
    .from('branches')
    .select('id, name, address')
    .eq('organization_id', org.id)
    .eq('is_active', true);

  return (
    <AuthPageShell
      wide
      badge="Online Booking Request"
      titleAccent={org.name}
      subtitle="Trustworthy veterinary business platform"
      description="Fill in your contact and pet details below. Attending branch staff will confirm your slot via email shortly."
    >
      <PublicBookingFormClient orgSlug={org.slug} branches={branches || []} />
    </AuthPageShell>
  );
}
