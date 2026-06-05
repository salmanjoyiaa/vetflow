export type Feature =
  | 'appointments'
  | 'inventory'
  | 'sales'
  | 'reports'
  | 'multi_branch'
  | 'ai_assistant'
  | 'social_automation';

export const ALL_FEATURES: Feature[] = [
  'appointments',
  'inventory',
  'sales',
  'reports',
  'multi_branch',
  'ai_assistant',
  'social_automation',
];

export const FEATURE_LABELS: Record<Feature, string> = {
  appointments: 'Appointments & walk-ins',
  inventory: 'Inventory management',
  sales: 'Sales & invoicing',
  reports: 'Advanced reports',
  multi_branch: 'Multi-branch access',
  ai_assistant: 'AI assistant',
  social_automation: 'Social media automation',
};

/** Nav route → required feature (undefined = no feature gate) */
export const ROUTE_FEATURES: Record<string, Feature | undefined> = {
  '/dashboard/appointments': 'appointments',
  '/dashboard/walk-ins': 'appointments',
  '/dashboard/inventory': 'inventory',
  '/dashboard/invoices': 'sales',
  '/dashboard/reports': 'reports',
  '/dashboard/branches': 'multi_branch',
};

export function resolveFeatures(
  featuresJson: Record<string, unknown> | null | undefined
): Feature[] {
  const enabled: Feature[] = [];
  for (const feature of ALL_FEATURES) {
    const value = featuresJson?.[feature];
    if (value === false) {
      continue;
    }
    enabled.push(feature);
  }
  return enabled;
}

export function hasFeature(
  features: Feature[],
  feature: Feature
): boolean {
  return features.includes(feature);
}

export function canAccessRouteByFeature(
  features: Feature[],
  href: string
): boolean {
  const base =
    Object.keys(ROUTE_FEATURES)
      .filter((r) => href === r || href.startsWith(`${r}/`))
      .sort((a, b) => b.length - a.length)[0] ?? null;

  if (!base) return true;
  const feature = ROUTE_FEATURES[base];
  if (!feature) return true;
  return hasFeature(features, feature);
}

export function featuresToJson(
  features: Feature[]
): Record<string, boolean> {
  const out: Record<string, boolean> = {};
  for (const f of ALL_FEATURES) {
    out[f] = features.includes(f);
  }
  return out;
}
