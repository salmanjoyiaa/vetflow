import { redirect } from 'next/navigation';

/**
 * Public self-serve registration is disabled. Clinics are provisioned by a
 * platform super admin. Prospective clinics are routed to the request-access flow.
 */
export default function RegisterPage() {
  redirect('/request-access');
}
