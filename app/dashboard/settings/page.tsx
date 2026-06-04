import { redirect } from 'next/navigation';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import DeniedState from '@/components/ui/premium/DeniedState';
import { createClient } from '@/lib/supabase/server';
import SettingsForm from '@/components/forms/SettingsForm';
import { Settings } from 'lucide-react';

export const metadata = {
  title: 'VetFlow Clinic Settings',
  description: 'Configure clinic preferences, timezone, currency, and tax settings.',
};

export default async function SettingsPage() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  try {
    assertCapability(ctx, 'manage_settings');
  } catch {
    return (
      <DeniedState
        title="Settings restricted"
        message="Only clinic administrators can manage organization settings."
      />
    );
  }

  const session = ctx;

  if (!session.organizationId) {
    return (
      <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 text-xs p-6 rounded-2xl">
        No organization is linked to your account. Contact your platform administrator.
      </div>
    );
  }

  const supabase = await createClient();

  const [{ data: appSettings }, { data: taxSettings }] = await Promise.all([
    supabase
      .from('app_settings')
      .select('timezone, currency')
      .eq('organization_id', session.organizationId)
      .maybeSingle(),
    supabase
      .from('tax_settings')
      .select('is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services')
      .eq('organization_id', session.organizationId)
      .maybeSingle(),
  ]);

  const defaultValues = {
    timezone: appSettings?.timezone || 'UTC',
    currency: appSettings?.currency || 'USD',
    isTaxEnabled: taxSettings?.is_enabled ?? true,
    taxName: taxSettings?.tax_name || 'VAT',
    taxPercentage: Number(taxSettings?.tax_percentage ?? 15),
    appliesToProducts: taxSettings?.applies_to_products ?? true,
    appliesToServices: taxSettings?.applies_to_services ?? true,
  };

  return (
    <div className="space-y-8">
      <div>
        <h2 className="text-xl font-black text-on-surface tracking-tight flex items-center gap-2">
          <Settings className="w-5 h-5 text-primary" />
          Clinic Settings
        </h2>
        <p className="text-xs text-on-surface-variant/70 mt-1">
          Manage preferences for {session.organizationName || 'your clinic'}.
        </p>
      </div>

      <SettingsForm defaultValues={defaultValues} />
    </div>
  );
}

