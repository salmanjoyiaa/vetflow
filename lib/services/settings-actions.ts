'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';
import { SettingsSchema, type SettingsInput } from '@/lib/validations/schemas';

export async function updateSettingsAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) {
      throw new Error('Unauthorized: Session is invalid.');
    }
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_settings');

    const parsed = SettingsSchema.parse(payload);
    const supabase = await createClient();
    const orgId = ctx.organizationId;

    const { error: appError } = await supabase
      .from('app_settings')
      .upsert(
        {
          organization_id: orgId,
          timezone: parsed.timezone,
          currency: parsed.currency,
          clinic_logo_url: parsed.clinicLogoUrl || null,
          clinic_address: parsed.clinicAddress || null,
          clinic_phone: parsed.clinicPhone || null,
          clinic_email: parsed.clinicEmail || null,
          pdf_branding_enabled: parsed.pdfBrandingEnabled ?? false,
          pdf_accent_color: parsed.pdfAccentColor || null,
          pdf_footer_text: parsed.pdfFooterText || null,
        },
        { onConflict: 'organization_id' }
      );

    if (appError) {
      throw new Error(appError.message || 'Failed to update app settings.');
    }

    const { error: taxError } = await supabase
      .from('tax_settings')
      .upsert(
        {
          organization_id: orgId,
          is_enabled: parsed.isTaxEnabled,
          tax_name: parsed.taxName,
          tax_percentage: parsed.taxPercentage,
          applies_to_products: parsed.appliesToProducts,
          applies_to_services: parsed.appliesToServices,
        },
        { onConflict: 'organization_id' }
      );

    if (taxError) {
      throw new Error(taxError.message || 'Failed to update tax settings.');
    }

    await writeAuditLog({
      organizationId: orgId,
      branchId: ctx.activeBranchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'SETTINGS_UPDATED',
      resourceType: 'APP_SETTINGS',
      resourceId: orgId,
      afterData: parsed,
    });

    return { success: true };
  } catch (err: any) {
    return { success: false, error: err.message || 'Failed to update settings.' };
  }
}
