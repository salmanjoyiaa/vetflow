import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import Link from 'next/link';
import {
  Stethoscope,
  LayoutDashboard,
  Building2,
  LogOut,
  Shield,
} from 'lucide-react';
import { logoutAction } from '@/lib/services/auth-actions';

function SuperAdminNavLink({
  href,
  label,
  icon: Icon,
}: {
  href: string;
  label: string;
  icon: React.ComponentType<{ className?: string }>;
}) {
  return (
    <Link
      href={href}
      className="hover:text-primary transition-colors flex items-center gap-1.5 text-xs font-bold text-on-surface-variant hover:bg-surface-container-high px-3 py-1.5 rounded-lg"
    >
      <Icon className="w-3.5 h-3.5" />
      {label}
    </Link>
  );
}

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveServerSession();

  if (!session || !session.isSuperAdmin) {
    redirect('/login');
  }

  const displayName = [session.firstName || 'User', session.lastName].filter(Boolean).join(' ');
  const avatarInitial = (session.firstName?.charAt(0) || session.email?.charAt(0) || 'U').toUpperCase();

  return (
    <div className="min-h-screen bg-surface flex flex-col mesh-gradient">
      <header className="h-16 border-b border-outline-variant bg-surface-container/90 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-10 gap-4">
        <div className="flex items-center gap-4 md:gap-6 min-w-0">
          <div className="flex items-center gap-2 shrink-0">
            <div className="w-8 h-8 bg-primary-container flex items-center justify-center rounded-xl">
              <Stethoscope className="w-4 h-4 text-on-primary" />
            </div>
            <div className="hidden sm:block">
              <span className="font-bold text-sm text-on-surface block font-[family-name:var(--font-display)]">
                VetFlow Central
              </span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
                <Shield className="w-3 h-3 text-primary" />
                Platform Admin
              </span>
            </div>
          </div>

          <nav className="flex items-center gap-1 md:gap-2 overflow-x-auto">
            <SuperAdminNavLink href="/super-admin/dashboard" label="Dashboard" icon={LayoutDashboard} />
            <SuperAdminNavLink href="/super-admin/organizations" label="Clinics" icon={Building2} />
          </nav>
        </div>

        <div className="flex items-center gap-3 shrink-0">
          <div className="hidden md:flex items-center gap-2">
            <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs uppercase">
              {avatarInitial}
            </div>
            <div className="text-right">
              <span className="text-[11px] font-bold text-on-surface block">{displayName}</span>
              <span className="text-[9px] text-on-surface-variant block">Super Admin</span>
            </div>
          </div>
          <form action={logoutAction}>
            <button
              type="submit"
              className="text-xs font-bold text-on-surface-variant hover:text-destructive flex items-center gap-1 px-2 py-1.5 rounded-lg hover:bg-surface-container-high"
            >
              <LogOut className="w-4 h-4" />
              <span className="hidden sm:inline">Sign Out</span>
            </button>
          </form>
        </div>
      </header>

      <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
    </div>
  );
}
