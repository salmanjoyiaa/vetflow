'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { isCameraFeedEnabled } from '@/lib/auth/features';

async function assertCameraFeedFeature(organizationId: string) {
  const supabase = await createClient();
  const { data: sub } = await supabase
    .from('subscription_status')
    .select('features')
    .eq('organization_id', organizationId)
    .maybeSingle();

  if (!isCameraFeedEnabled((sub?.features as Record<string, unknown>) || null)) {
    throw new Error('Camera feed is not enabled for this organization.');
  }
}

export async function listCameraDevicesAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'view_camera_feed');
    await assertCameraFeedFeature(ctx.organizationId);
    if (!ctx.activeBranchId) throw new Error('Select a branch');

    const supabase = await createClient();
    const { data, error } = await supabase
      .from('camera_devices')
      .select('id, name, snapshot_url, stream_url, is_active')
      .eq('branch_id', ctx.activeBranchId)
      .eq('is_active', true);

    if (error) throw new Error(error.message);
    return { success: true, devices: data || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed', devices: [] };
  }
}

const DeviceSchema = z.object({
  name: z.string().min(1),
  snapshotUrl: z.string().optional().or(z.literal('')),
  streamUrl: z.string().optional().or(z.literal('')),
});

export async function createCameraDeviceAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_camera_devices');
    await assertCameraFeedFeature(ctx.organizationId);
    if (!ctx.activeBranchId) throw new Error('Select a branch');

    const parsed = DeviceSchema.parse(payload);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('camera_devices')
      .insert({
        organization_id: ctx.organizationId,
        branch_id: ctx.activeBranchId,
        name: parsed.name,
        snapshot_url: parsed.snapshotUrl || null,
        stream_url: parsed.streamUrl || null,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, device: data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed' };
  }
}
