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
  | 'manage_attendance'
  | 'mark_attendance'
  | 'manage_settings'
  | 'manage_subscription'
  | 'use_ai_assistant'
  | 'manage_social'
  | 'view_patient_history'
  | 'view_consultation_status'
  | 'view_treatment_pdf'
  | 'view_camera_feed'
  | 'manage_camera_devices';

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
    'manage_attendance',
    'mark_attendance',
    'manage_settings',
    'manage_subscription',
    'use_ai_assistant',
    'manage_social',
    'view_consultation_status',
    'view_treatment_pdf',
    'view_camera_feed',
    'manage_camera_devices',
  ],
  doctor: [
    'view_dashboard',
    'manage_appointments',
    'clinical_queue',
    'manage_prescriptions',
    'view_patient_history',
    'view_treatment_pdf',
    'mark_attendance',
    'use_ai_assistant',
  ],
  receptionist: [
    'view_dashboard',
    'manage_appointments',
    'manage_walk_ins',
    'manage_customers',
    'manage_pets',
    'billing_checkout',
    'manage_inventory',
    'view_consultation_status',
    'view_camera_feed',
    'mark_attendance',
    'use_ai_assistant',
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
  '/dashboard/schedule': 'manage_appointments',
  '/dashboard/walk-ins': 'manage_walk_ins',
  '/dashboard/customers': 'manage_customers',
  '/dashboard/pets': 'manage_pets',
  '/dashboard/doctors': 'clinical_queue',
  '/dashboard/doctors/patients': 'view_patient_history',
  '/dashboard/prescriptions': 'manage_prescriptions',
  '/dashboard/invoices': 'billing_checkout',
  '/dashboard/inventory': 'manage_inventory',
  '/dashboard/reports': 'view_reports',
  '/dashboard/branches': 'manage_branches',
  '/dashboard/staff': 'manage_staff',
  '/dashboard/settings': 'manage_settings',
  '/dashboard/upgrade': 'manage_subscription',
  '/dashboard/ai-assistant': 'use_ai_assistant',
  '/dashboard/social': 'manage_social',
  '/dashboard/benchmarking': 'view_reports',
  '/dashboard/reports/ai': 'view_reports',
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

export const DASHBOARD_WIDGETS = {
  todayAppointments: 'manage_appointments',
  waitingWalkIns: 'manage_walk_ins',
  readyForCheckout: 'billing_checkout',
  unpaidInvoices: 'billing_checkout',
  lowStock: 'manage_inventory',
  totalCustomers: 'manage_customers',
  totalPets: 'manage_pets',
  clinicalQueue: 'clinical_queue',
  openPrescriptions: 'manage_prescriptions',
  adminReports: 'view_reports',
  adminStaff: 'manage_staff',
} as const;

export type DashboardWidgetKey = keyof typeof DASHBOARD_WIDGETS;

export function canShowWidget(
  role: UserSessionDetails['role'],
  widgetKey: DashboardWidgetKey
): boolean {
  return hasCapability(role, DASHBOARD_WIDGETS[widgetKey]);
}
