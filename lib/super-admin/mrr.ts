export function estimatePlanMrr(planName: string | null | undefined): number {
  const plan = planName?.toLowerCase() || '';
  if (plan.includes('starter')) return 49;
  if (plan.includes('growth')) return 149;
  if (plan.includes('enterprise')) return 299;
  return 99;
}

export function estimateMrrForSubscriptions(
  subs: { status: string; plan_name: string | null }[]
): number {
  let total = 0;
  for (const sub of subs) {
    if (sub.status === 'active') {
      total += estimatePlanMrr(sub.plan_name);
    }
  }
  return total;
}
