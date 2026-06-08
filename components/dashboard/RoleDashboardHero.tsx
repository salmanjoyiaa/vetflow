import Link from 'next/link';
import { Activity } from 'lucide-react';
import type { UserSessionDetails } from '@/lib/services/auth';

export type QuickLink = {
  key: string;
  href: string;
  label: string;
};

interface RoleDashboardHeroProps {
  firstName: string;
  greeting: string;
  organizationName?: string | null;
  role: UserSessionDetails['role'];
  quickLinks: QuickLink[];
}

function roleLabel(role: UserSessionDetails['role']): string {
  switch (role) {
    case 'clinic_admin':
      return 'Clinic Admin';
    case 'receptionist':
      return 'Receptionist';
    case 'doctor':
      return 'Doctor';
    default:
      return 'Staff';
  }
}

function roleSubtitle(role: UserSessionDetails['role'], orgName?: string | null): string {
  const org = orgName ? `Managing ${orgName}.` : '';
  switch (role) {
    case 'doctor':
      return `${org} Your clinical queue and appointments at a glance.`.trim();
    case 'receptionist':
      return `${org} Front desk operations, intake, and billing at a glance.`.trim();
    case 'clinic_admin':
      return `${org} Full clinic performance and administration overview.`.trim();
    default:
      return `${org} Here's your clinic at a glance.`.trim();
  }
}

export default function RoleDashboardHero({
  firstName,
  greeting,
  organizationName,
  role,
  quickLinks,
}: RoleDashboardHeroProps) {

  return (
    <div className="relative overflow-hidden rounded-3xl glass-panel border-primary/20 p-8 md:p-10 mesh-gradient">
      <div className="absolute inset-0 opacity-10">
        <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-primary blur-3xl" />
        <div className="absolute bottom-0 left-12 w-48 h-48 rounded-full bg-gold blur-3xl" />
      </div>
      <div className="relative z-10">
        <div className="flex items-center gap-2 mb-2">
          <Activity className="w-4 h-4 text-primary" />
          <span className="text-[10px] font-bold uppercase tracking-widest text-primary">
            {roleLabel(role)} · Clinic Dashboard
          </span>
        </div>
        <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
          {greeting}, {firstName}
        </h1>
        <p className="text-sm text-on-surface-variant mt-2 max-w-lg">
          {roleSubtitle(role, organizationName)}
        </p>
        {quickLinks.length > 0 && (
          <div className="flex flex-wrap gap-2 mt-4">
            {quickLinks.map((link) => (
              <Link
                key={link.key}
                href={link.href}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25"
              >
                {link.label}
              </Link>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
