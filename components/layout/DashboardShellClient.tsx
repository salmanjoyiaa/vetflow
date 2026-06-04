'use client';

import React, { useState, useEffect, useTransition } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import type { ServerAuthContext } from '@/lib/auth/context';
import { canAccessRoute } from '@/lib/auth/capabilities';
import { setActiveBranchAction } from '@/lib/services/branch-cookie-actions';
import { globalClinicSearchAction } from '@/lib/services/search-actions';
import { logoutAction } from '@/lib/services/auth-actions';
import ImpersonationBanner from '@/components/layout/ImpersonationBanner';
import type { LucideIcon } from 'lucide-react';
import {
  Stethoscope,
  LayoutDashboard,
  Calendar,
  ClipboardList,
  Users,
  FileText,
  Receipt,
  Layers,
  TrendingUp,
  MapPin,
  Settings,
  LogOut,
  Search,
  Bell,
  Menu,
  X,
  ChevronDown,
  BriefcaseMedical,
  Heart,
  Sparkles,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const ALL_NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/dashboard', icon: LayoutDashboard },
  { name: 'Appointments', href: '/dashboard/appointments', icon: Calendar },
  { name: 'Walk-ins', href: '/dashboard/walk-ins', icon: ClipboardList },
  { name: 'Customers', href: '/dashboard/customers', icon: Users },
  { name: 'Pets', href: '/dashboard/pets', icon: Heart },
  { name: 'Doctors', href: '/dashboard/doctors', icon: BriefcaseMedical },
  { name: 'Prescriptions', href: '/dashboard/prescriptions', icon: FileText },
  { name: 'Invoices', href: '/dashboard/invoices', icon: Receipt },
  { name: 'Inventory', href: '/dashboard/inventory', icon: Layers },
  { name: 'Reports', href: '/dashboard/reports', icon: TrendingUp },
  { name: 'Branches', href: '/dashboard/branches', icon: MapPin },
  { name: 'Staff', href: '/dashboard/staff', icon: Users },
  { name: 'Settings', href: '/dashboard/settings', icon: Settings },
  { name: 'Upgrade', href: '/dashboard/upgrade', icon: Sparkles },
];

function buildNavItems(role: ServerAuthContext['role']): NavItem[] {
  return ALL_NAV_ITEMS.filter((item) => canAccessRoute(role, item.href));
}

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/dashboard') {
    return pathname === '/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface DashboardShellClientProps {
  session: ServerAuthContext;
  activeBranchId?: string;
  children: React.ReactNode;
}

export default function DashboardShellClient({
  session,
  activeBranchId,
  children,
}: DashboardShellClientProps) {
  const pathname = usePathname();
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof globalClinicSearchAction>>['results']
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const activeBranch =
    session.branches.find((b) => b.id === activeBranchId) || session.branches[0];
  const displayName = [session.firstName || 'User', session.lastName].filter(Boolean).join(' ');
  const avatarInitial = (session.firstName?.charAt(0) || session.email?.charAt(0) || 'U').toUpperCase();
  const navItems = buildNavItems(session.role);

  useEffect(() => {
    const handleKeyDown = (e: KeyboardEvent) => {
      if ((e.metaKey || e.ctrlKey) && e.key === 'k') {
        e.preventDefault();
        setIsSearchOpen((prev) => !prev);
      }
    };
    window.addEventListener('keydown', handleKeyDown);
    return () => window.removeEventListener('keydown', handleKeyDown);
  }, []);

  useEffect(() => {
    if (!isSearchOpen) return;
    const q = searchQuery.trim();
    if (q.length < 2) {
      setSearchResults([]);
      return;
    }
    const timer = setTimeout(async () => {
      setSearchLoading(true);
      const res = await globalClinicSearchAction({ query: q });
      setSearchResults(res.success ? res.results || [] : []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen]);

  const handleBranchChange = (branchId: string) => {
    startTransition(async () => {
      const result = await setActiveBranchAction(branchId);
      if (result.success) {
        setIsBranchDropdownOpen(false);
        router.refresh();
      }
    });
  };

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
      active
        ? 'bg-primary/20 text-primary border border-primary/30'
        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
    }`;

  return (
    <div className="min-h-screen bg-surface flex flex-col mesh-gradient">
      {session.isImpersonating && session.organizationName && (
        <ImpersonationBanner organizationName={session.organizationName} />
      )}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4">
          <div className="glass-panel w-full max-w-xl overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-outline-variant">
              <Search className="w-5 h-5 text-outline" />
              <input
                type="text"
                placeholder="Search customers, pets, invoices..."
                className="w-full text-sm outline-none bg-transparent text-on-surface placeholder:text-outline"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button
                type="button"
                onClick={() => setIsSearchOpen(false)}
                className="text-[10px] font-semibold px-2 py-1 rounded border border-outline-variant text-on-surface-variant"
              >
                ESC
              </button>
            </div>
            <div className="p-2 max-h-72 overflow-y-auto">
              {searchLoading && (
                <p className="text-xs text-on-surface-variant text-center py-6">Searching...</p>
              )}
              {!searchLoading && searchQuery.trim().length < 2 && (
                <p className="text-xs text-on-surface-variant text-center py-6">
                  Type at least 2 characters
                </p>
              )}
              {!searchLoading &&
                searchQuery.trim().length >= 2 &&
                (searchResults?.length === 0 ? (
                  <p className="text-xs text-on-surface-variant text-center py-6">No results</p>
                ) : (
                  <ul className="divide-y divide-outline-variant/50">
                    {searchResults?.map((r) => (
                      <li key={`${r.type}-${r.id}`}>
                        <Link
                          href={r.href}
                          onClick={() => setIsSearchOpen(false)}
                          className="block px-3 py-2.5 hover:bg-surface-container-high rounded-lg"
                        >
                          <span className="text-[9px] uppercase text-primary font-bold">
                            {r.type}
                          </span>
                          <p className="text-xs font-semibold text-on-surface">{r.title}</p>
                          <p className="text-[10px] text-on-surface-variant">{r.subtitle}</p>
                        </Link>
                      </li>
                    ))}
                  </ul>
                ))}
            </div>
          </div>
        </div>
      )}

      <div className="flex flex-1 relative">
        <aside className="hidden lg:flex w-64 bg-surface-container border-r border-outline-variant flex-col sticky top-0 h-screen z-20">
          <div className="h-16 flex items-center px-6 gap-2.5 border-b border-outline-variant">
            <div className="w-8 h-8 bg-primary-container flex items-center justify-center rounded-xl">
              <Stethoscope className="w-4 h-4 text-on-primary" />
            </div>
            <div>
              <span className="font-bold text-sm text-on-surface block font-[family-name:var(--font-display)]">
                VetFlow
              </span>
              <span className="text-[9px] text-on-surface-variant uppercase tracking-wider">
                {session.organizationName || 'Clinic'}
              </span>
            </div>
          </div>

          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {navItems.map((item) => {
              const isActive = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <Link key={item.name} href={item.href} className={navLinkClass(isActive)}>
                  <Icon className="w-4 h-4" />
                  {item.name}
                </Link>
              );
            })}
          </nav>

          <div className="p-4 border-t border-outline-variant">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary/15 text-primary flex items-center justify-center font-bold text-xs">
                  {avatarInitial}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-on-surface block truncate">
                    {displayName}
                  </span>
                  <span className="text-[9px] text-on-surface-variant capitalize block">
                    {session.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <form action={logoutAction}>
                <button
                  type="submit"
                  className="text-on-surface-variant hover:text-destructive p-1.5 rounded-lg hover:bg-surface-container-high"
                  title="Sign Out"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </form>
            </div>
          </div>
        </aside>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="relative w-64 bg-surface-container h-full z-10 border-r border-outline-variant flex flex-col">
              <div className="h-16 flex items-center px-6 justify-between border-b border-outline-variant">
                <span className="font-bold text-sm text-on-surface">VetFlow</span>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
              <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                {navItems.map((item) => {
                  const isActive = isNavActive(pathname, item.href);
                  const Icon = item.icon;
                  return (
                    <Link
                      key={item.name}
                      href={item.href}
                      className={navLinkClass(isActive)}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </Link>
                  );
                })}
              </nav>
            </aside>
          </div>
        )}

        <div className="flex-1 flex flex-col min-w-0">
          <header className="h-16 border-b border-outline-variant bg-surface-container/80 backdrop-blur-md px-4 md:px-6 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              <button
                type="button"
                className="lg:hidden p-1 rounded text-on-surface-variant"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              {session.branches.length > 0 ? (
                <div className="relative">
                  <button
                    type="button"
                    disabled={isPending}
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl text-xs text-on-surface font-bold"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary" />
                    <span>{activeBranch?.name || 'Branch'}</span>
                    <ChevronDown className="w-3 h-3 text-outline" />
                  </button>
                  {isBranchDropdownOpen && (
                    <>
                      <div
                        className="fixed inset-0 z-20"
                        onClick={() => setIsBranchDropdownOpen(false)}
                      />
                      <div className="absolute left-0 mt-2 w-56 glass-panel z-30 py-1.5">
                        <span className="block px-4 py-1.5 text-[9px] font-semibold text-outline uppercase">
                          Branch scope
                        </span>
                        {session.branches.map((b) => (
                          <button
                            key={b.id}
                            type="button"
                            onClick={() => handleBranchChange(b.id)}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold hover:bg-surface-container-high ${
                              b.id === activeBranchId ? 'text-primary' : 'text-on-surface'
                            }`}
                          >
                            {b.name}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <span className="text-xs text-on-surface-variant flex items-center gap-2">
                  <MapPin className="w-3.5 h-3.5" />
                  No branch assigned
                </span>
              )}
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="hidden md:flex items-center gap-2 px-3 py-1.5 glass rounded-xl text-xs text-outline w-40"
              >
                <Search className="w-3.5 h-3.5" />
                <span>Search</span>
              </button>
              <button
                type="button"
                className="p-2 glass rounded-xl text-on-surface-variant relative"
              >
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-tertiary rounded-full" />
              </button>
            </div>
          </header>

          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
