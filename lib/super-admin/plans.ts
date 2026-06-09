import { createAdminClient } from '@/lib/supabase/server';
import type { PlanOption } from '@/components/forms/SubscriptionForm';

export async function loadSuperAdminPlans(): Promise<PlanOption[]> {
  const adminClient = await createAdminClient();
  const { data } = await adminClient
    .from('plans')
    .select('id, name, price, default_features')
    .eq('is_active', true)
    .order('price', { ascending: true });

  return (data || []).map((p) => ({
    id: p.id,
    name: p.name,
    price: Number(p.price) || 0,
    default_features: (p.default_features as Record<string, boolean>) ?? {},
  }));
}
