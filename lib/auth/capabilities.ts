import type { UserSessionDetails } from '@/lib/services/auth';

export type ClinicRole = Exclude<UserSessionDetails['role'], 'super_admin' | null>;

export type Capability =
  | 'view_dashboard'
  | 'manage_appointments'
  | 'manage_walk_ins'
  | 'manage_customers'
  | 'manage_pets'
  | 'clinical_queue'
  | 'manage_prescriptions'
  | 'billing_checkout'
  | 'manage_inventory'
  | 'view_reports'
  | 'manage_branches'
  | 'manage_staff'
  | 'manage_settings'
  | 'manage_subscription';

const ROLE_CAPABILITIES: Record<ClinicRole, Capability[]> = {
  clinic_admin: [
    'view_dashboard',
    'manage_appointments',
    'manage_walk_ins',
    'manage_customers',
    'manage_pets',
    'clinical_queue',
    'manage_prescriptions',
    'billing_checkout',
    'manage_inventory',
    'view_reports',
    'manage_branches',
    'manage_staff',
    'manage_settings',
    'manage_subscription',
  ],
  doctor: [
    'view_dashboard',
    'manage_appointments',
    'clinical_queue',
    'manage_prescriptions',
  ],
  receptionist: [
    'view_dashboard',
    'manage_appointments',
    'manage_walk_ins',
    'manage_customers',
    'manage_pets',
    'billing_checkout',
    'manage_inventory',
  ],
};

export function getCapabilitiesForRole(
  role: UserSessionDetails['role']
): Capability[] {
  if (!role || role === 'super_admin') {
    return [];
  }
  return ROLE_CAPABILITIES[role as ClinicRole] ?? [];
}

export function hasCapability(
  role: UserSessionDetails['role'],
  capability: Capability
): boolean {
  return getCapabilitiesForRole(role).includes(capability);
}

/** Nav route → required capability (undefined = all clinic roles with dashboard access) */
export const ROUTE_CAPABILITIES: Record<string, Capability | undefined> = {
  '/dashboard': 'view_dashboard',
  '/dashboard/appointments': 'manage_appointments',
  '/dashboard/walk-ins': 'manage_walk_ins',
  '/dashboard/customers': 'manage_customers',
  '/dashboard/pets': 'manage_pets',
  '/dashboard/doctors': 'clinical_queue',
  '/dashboard/prescriptions': 'manage_prescriptions',
  '/dashboard/invoices': 'billing_checkout',
  '/dashboard/inventory': 'manage_inventory',
  '/dashboard/reports': 'view_reports',
  '/dashboard/branches': 'manage_branches',
  '/dashboard/staff': 'manage_staff',
  '/dashboard/settings': 'manage_settings',
  '/dashboard/upgrade': 'manage_subscription',
};

export function canAccessRoute(
  role: UserSessionDetails['role'],
  href: string
): boolean {
  const base =
    Object.keys(ROUTE_CAPABILITIES)
      .filter((r) => href === r || href.startsWith(`${r}/`))
      .sort((a, b) => b.length - a.length)[0] ?? '/dashboard';

  const cap = ROUTE_CAPABILITIES[base];
  if (!cap) return true;
  return hasCapability(role, cap);
}
