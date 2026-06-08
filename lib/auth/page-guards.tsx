import DeniedState from '@/components/ui/premium/DeniedState';
import {
  assertCapability,
  assertFeature,
  type ServerAuthContext,
} from '@/lib/auth/context';
import {
  canAccessRoute,
  ROUTE_CAPABILITIES,
  type Capability,
} from '@/lib/auth/capabilities';
import {
  canAccessRouteByFeature,
  FEATURE_LABELS,
  ROUTE_FEATURES,
  type Feature,
} from '@/lib/auth/features';

export const CAPABILITY_LABELS: Record<Capability, string> = {
  view_dashboard: 'Dashboard overview',
  manage_appointments: 'Appointments',
  manage_walk_ins: 'Walk-in intake',
  manage_customers: 'Customer directory',
  manage_pets: 'Pet registry',
  clinical_queue: 'Clinical queue',
  manage_prescriptions: 'Prescriptions',
  billing_checkout: 'Billing & checkout',
  manage_inventory: 'Inventory',
  view_reports: 'Reports',
  manage_branches: 'Branch management',
  manage_staff: 'Staff management',
  manage_attendance: 'Staff scheduling & attendance',
  mark_attendance: 'Attendance check-in',
  manage_settings: 'Clinic settings',
  manage_subscription: 'Subscription & billing',
  use_ai_assistant: 'AI assistant',
  manage_social: 'Social media automation',
  view_patient_history: 'Patient medical history',
};

export function renderCapabilityDenied(capability: Capability) {
  return (
    <DeniedState
      title="Access restricted"
      message={`Your role does not have permission to access ${CAPABILITY_LABELS[capability]}. Contact your clinic administrator if you need access.`}
    />
  );
}

export function renderFeatureDenied(feature: Feature) {
  return (
    <DeniedState
      title="Feature not enabled"
      message={`${FEATURE_LABELS[feature]} is not enabled for your clinic. Contact ClinixDev support or upgrade your plan.`}
    />
  );
}

export function guardCapability(ctx: ServerAuthContext, capability: Capability) {
  try {
    assertCapability(ctx, capability);
    return null;
  } catch {
    return renderCapabilityDenied(capability);
  }
}

export function guardFeature(ctx: ServerAuthContext, feature: Feature) {
  try {
    assertFeature(ctx, feature);
    return null;
  } catch {
    return renderFeatureDenied(feature);
  }
}

function resolveRouteBase(pathname: string): string {
  const allRoutes = [
    ...Object.keys(ROUTE_CAPABILITIES),
    ...Object.keys(ROUTE_FEATURES),
  ];
  const unique = [...new Set(allRoutes)];
  return (
    unique
      .filter((r) => pathname === r || pathname.startsWith(`${r}/`))
      .sort((a, b) => b.length - a.length)[0] ?? '/dashboard'
  );
}

/** Combined capability + feature guard for a dashboard route path */
export function guardRoute(ctx: ServerAuthContext, pathname: string) {
  const base = resolveRouteBase(pathname);
  const cap = ROUTE_CAPABILITIES[base];
  if (cap) {
    const capDenied = guardCapability(ctx, cap);
    if (capDenied) return capDenied;
  }
  const feature = ROUTE_FEATURES[base];
  if (feature) {
    const featureDenied = guardFeature(ctx, feature);
    if (featureDenied) return featureDenied;
  }
  if (!canAccessRoute(ctx.role, pathname)) {
    const fallbackCap = ROUTE_CAPABILITIES[base] ?? 'view_dashboard';
    return renderCapabilityDenied(fallbackCap);
  }
  if (!canAccessRouteByFeature(ctx.features, pathname)) {
    const fallbackFeature = ROUTE_FEATURES[base];
    if (fallbackFeature) return renderFeatureDenied(fallbackFeature);
  }
  return null;
}
