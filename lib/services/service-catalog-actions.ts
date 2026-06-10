'use server';

import { z } from 'zod';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { writeAuditLog } from '@/lib/services/audit';

const ServiceSchema = z.object({
  name: z.string().min(1, { message: 'Service name is required' }),
  description: z.string().optional().or(z.literal('')),
  price: z.number().nonnegative(),
  isActive: z.boolean().default(true),
});

const ServiceIdSchema = z.object({
  serviceId: z.string().uuid(),
});

const DEFAULT_SERVICES = [
  { name: 'Consultation', description: 'General veterinary consultation', price: 50 },
  { name: 'Vaccination', description: 'Routine vaccination', price: 35 },
  { name: 'Lab Test', description: 'Laboratory diagnostic test', price: 45 },
  { name: 'Deworming', description: 'Deworming treatment', price: 25 },
  { name: 'Grooming', description: 'Basic grooming service', price: 40 },
  { name: 'Surgery - Minor', description: 'Minor surgical procedure', price: 150 },
];

async function ensureDefaultServices(orgId: string) {
  const supabase = await createClient();
  const { count } = await supabase
    .from('services')
    .select('id', { count: 'exact', head: true })
    .eq('organization_id', orgId);

  if ((count ?? 0) > 0) return;

  await supabase.from('services').insert(
    DEFAULT_SERVICES.map((s) => ({
      organization_id: orgId,
      name: s.name,
      description: s.description,
      price: s.price,
      is_active: true,
    }))
  );
}

export async function listServicesAction() {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);

    const supabase = await createClient();
    await ensureDefaultServices(ctx.organizationId!);

    const { data, error } = await supabase
      .from('services')
      .select('id, name, description, price, is_active')
      .eq('organization_id', ctx.organizationId)
      .order('name');

    if (error) throw new Error(error.message);
    return { success: true, services: data || [] };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to load services' };
  }
}

export async function createServiceAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_settings');

    const parsed = ServiceSchema.parse(payload);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('services')
      .insert({
        organization_id: ctx.organizationId,
        name: parsed.name,
        description: parsed.description || null,
        price: parsed.price,
        is_active: parsed.isActive,
      })
      .select()
      .single();

    if (error) throw new Error(error.message);

    await writeAuditLog({
      organizationId: ctx.organizationId,
      branchId: ctx.activeBranchId,
      actorUserId: ctx.userId,
      actorRole: ctx.role || 'clinic_admin',
      action: 'SERVICE_CREATED',
      resourceType: 'SERVICE',
      resourceId: data.id,
      afterData: data,
    });

    return { success: true, service: data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to create service' };
  }
}

export async function updateServiceAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_settings');

    const parsed = ServiceSchema.extend({ serviceId: z.string().uuid() }).parse(payload);
    const supabase = await createClient();

    const { data, error } = await supabase
      .from('services')
      .update({
        name: parsed.name,
        description: parsed.description || null,
        price: parsed.price,
        is_active: parsed.isActive,
      })
      .eq('id', parsed.serviceId)
      .eq('organization_id', ctx.organizationId)
      .select()
      .single();

    if (error) throw new Error(error.message);
    return { success: true, service: data };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to update service' };
  }
}

export async function deleteServiceAction(payload: unknown) {
  try {
    const ctx = await resolveServerAuthContext();
    if (!ctx) throw new Error('Unauthorized');
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_settings');

    const { serviceId } = ServiceIdSchema.parse(payload);
    const supabase = await createClient();

    const { error } = await supabase
      .from('services')
      .update({ is_active: false })
      .eq('id', serviceId)
      .eq('organization_id', ctx.organizationId);

    if (error) throw new Error(error.message);
    return { success: true };
  } catch (err: unknown) {
    return { success: false, error: err instanceof Error ? err.message : 'Failed to delete service' };
  }
}
