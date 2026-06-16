export const UPCOMING_APPOINTMENT_STATUSES = [
  'requested',
  'confirmed',
  'rescheduled',
  'checked_in',
] as const;

export const TERMINAL_APPOINTMENT_STATUSES = [
  'completed',
  'cancelled',
  'no_show',
] as const;

export const CHECK_IN_ELIGIBLE_STATUSES = ['confirmed', 'rescheduled'] as const;

export type UpcomingAppointmentStatus = (typeof UPCOMING_APPOINTMENT_STATUSES)[number];
export type TerminalAppointmentStatus = (typeof TERMINAL_APPOINTMENT_STATUSES)[number];

export function isUpcomingAppointment(status: string): boolean {
  return (UPCOMING_APPOINTMENT_STATUSES as readonly string[]).includes(status);
}

export function isTerminalAppointment(status: string): boolean {
  return (TERMINAL_APPOINTMENT_STATUSES as readonly string[]).includes(status);
}

export function isEmergencyAppointmentActive(
  isEmergency: boolean | undefined,
  status: string
): boolean {
  return Boolean(isEmergency) && !isTerminalAppointment(status);
}
