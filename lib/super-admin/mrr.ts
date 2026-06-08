// ====================================================================
// Platform MRR / ARR helpers — data-driven from the `plans` table.
// No hardcoded prices: callers fetch plans.price and pass a price map.
// ====================================================================

/** Canonical plan identifiers used across the platform. */
export const PLAN_IDS = ['trial', 'starter', 'pro', 'enterprise'] as const;
export type PlanId = (typeof PLAN_IDS)[number];

/** Map of lowercased plan id -> monthly price (from public.plans). */
export type PlanPriceMap = Record<string, number>;

/** Build a price map keyed by lowercased plan id from the plans table. */
export function buildPlanPriceMap(
  plans: { id: string; price: number | string | null }[] | null | undefined
): PlanPriceMap {
  const map: PlanPriceMap = {};
  for (const p of plans ?? []) {
    if (!p?.id) continue;
    map[String(p.id).toLowerCase()] = Number(p.price) || 0;
  }
  return map;
}

/** Resolve the monthly price for a plan id/name using a DB-derived price map. */
export function planPrice(
  planKey: string | null | undefined,
  priceMap: PlanPriceMap
): number {
  if (!planKey) return 0;
  return priceMap[planKey.toLowerCase()] ?? 0;
}

/** Monthly recurring revenue from active subscriptions, using real plan prices. */
export function computeMrr(
  subs: { status: string; plan_id?: string | null; plan_name?: string | null }[],
  priceMap: PlanPriceMap
): number {
  let total = 0;
  for (const sub of subs) {
    if (sub.status !== 'active') continue;
    total += planPrice(sub.plan_id ?? sub.plan_name, priceMap);
  }
  return Math.round(total * 100) / 100;
}

/** Annual recurring revenue derived from MRR. */
export function computeArr(mrr: number): number {
  return Math.round(mrr * 12 * 100) / 100;
}
