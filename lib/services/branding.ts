import { isBrandedPdfsEnabled } from '@/lib/auth/features';
import type { SupabaseClient } from '@supabase/supabase-js';

export interface PdfBranding {
  /** True only when the platform allows branded PDFs AND the clinic enabled them. */
  enabled: boolean;
  brandName: string;
  clinicName: string;
  address: string;
  phone: string;
  email: string;
  logoUrl: string | null;
  accentColor: string;
  footerText: string;
}

const DEFAULT_ACCENT = '#0F172A';

/**
 * Resolves the effective PDF branding for an organization.
 *
 * Two gates must both pass for `enabled` to be true:
 *  1. The super-admin flag `branded_pdfs` on the org's subscription features.
 *  2. The clinic-admin toggle `pdf_branding_enabled` in app_settings.
 *
 * When disabled, default ClinixDev branding is returned so PDFs still render.
 */
export async function getPdfBranding(
  supabase: SupabaseClient,
  organizationId: string,
  fallbackClinicName: string
): Promise<PdfBranding> {
  const [{ data: appSettings }, { data: sub }] = await Promise.all([
    supabase
      .from('app_settings')
      .select(
        'clinic_logo_url, clinic_address, clinic_phone, clinic_email, pdf_branding_enabled, pdf_accent_color, pdf_footer_text'
      )
      .eq('organization_id', organizationId)
      .maybeSingle(),
    supabase
      .from('subscription_status')
      .select('features')
      .eq('organization_id', organizationId)
      .maybeSingle(),
  ]);

  const platformAllows = isBrandedPdfsEnabled(
    (sub?.features as Record<string, unknown>) || null
  );
  const clinicEnabled = appSettings?.pdf_branding_enabled === true;
  const enabled = platformAllows && clinicEnabled;

  return {
    enabled,
    brandName: enabled ? fallbackClinicName : 'ClinixDev',
    clinicName: fallbackClinicName,
    address: (enabled && appSettings?.clinic_address) || '',
    phone: (enabled && appSettings?.clinic_phone) || '',
    email: (enabled && appSettings?.clinic_email) || '',
    logoUrl: enabled ? appSettings?.clinic_logo_url || null : null,
    accentColor: (enabled && appSettings?.pdf_accent_color) || DEFAULT_ACCENT,
    footerText: (enabled && appSettings?.pdf_footer_text) || '',
  };
}
