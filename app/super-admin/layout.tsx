import { redirect } from 'next/navigation';
import { resolveServerSession } from '@/lib/services/auth';
import Link from 'next/link';
import { ShieldCheck, Stethoscope, LayoutDashboard, Building2, LogOut } from 'lucide-react';
import { logoutAction } from '@/lib/services/auth-actions';

export default async function SuperAdminLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const session = await resolveServerSession();

  if (!session || !session.isSuperAdmin) {
    redirect('/login');
  }

  return (
    <div className="min-h-screen bg-primary-ivory flex flex-col font-sans">
      
      {/* HEADER */}
      <header className="h-16 border-b border-border/40 bg-white px-6 flex items-center justify-between sticky top-0 z-10">
        <div className="flex items-center gap-6">
          <div className="flex items-center gap-2">
            <Stethoscope className="w-5 h-5 text-primary-teal" />
            <span className="font-bold text-sm tracking-tight text-primary-navy">VetFlow Central</span>
            <span className="bg-primary-teal/10 text-primary-teal text-[8px] font-bold px-1.5 py-0.5 rounded uppercase">
              Platform Admin
            </span>
          </div>

          <nav className="flex items-center gap-4 text-xs font-bold text-graphite/70">
            <Link 
              href="/super-admin/dashboard" 
              className="hover:text-primary-navy transition-colors flex items-center gap-1"
            >
              <LayoutDashboard className="w-3.5 h-3.5" />
              Dashboard
            </Link>
            <Link 
              href="/super-admin/organizations" 
              className="hover:text-primary-navy transition-colors flex items-center gap-1"
            >
              <Building2 className="w-3.5 h-3.5" />
              Clinics
            </Link>
          </nav>
        </div>

        <form action={logoutAction}>
          <button 
            type="submit"
            className="text-xs font-bold text-graphite/60 hover:text-red-500 transition-colors flex items-center gap-1"
          >
            <LogOut className="w-4 h-4" />
            Sign Out
          </button>
        </form>
      </header>

      {/* VIEWPORT */}
      <main className="flex-1 p-8 max-w-7xl w-full mx-auto">
        {children}
      </main>

    </div>
  );
}
