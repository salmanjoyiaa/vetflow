'use client';

import React, { useEffect, useState } from 'react';
import { usePathname } from 'next/navigation';
import DashboardNavLink from '@/components/layout/DashboardNavLink';
import NavigationLoadingOverlay from '@/components/layout/NavigationLoadingOverlay';
import LogoutButton from '@/components/ui/premium/LogoutButton';
import { platformTenantSearchAction } from '@/lib/services/super-admin-actions';
import type { LucideIcon } from 'lucide-react';
import {
  Stethoscope,
  LayoutDashboard,
  Building2,
  CreditCard,
  ScrollText,
  Users,
  Menu,
  X,
  Shield,
  Search,
} from 'lucide-react';

interface NavItem {
  name: string;
  href: string;
  icon: LucideIcon;
}

const NAV_ITEMS: NavItem[] = [
  { name: 'Dashboard', href: '/super-admin/dashboard', icon: LayoutDashboard },
  { name: 'Clinics', href: '/super-admin/organizations', icon: Building2 },
  { name: 'Billing', href: '/super-admin/billing', icon: CreditCard },
  { name: 'Users & access', href: '/super-admin/users', icon: Users },
  { name: 'Audit log', href: '/super-admin/audit', icon: ScrollText },
];

function isNavActive(pathname: string, href: string): boolean {
  if (href === '/super-admin/dashboard') {
    return pathname === '/super-admin/dashboard';
  }
  return pathname === href || pathname.startsWith(`${href}/`);
}

interface SuperAdminShellClientProps {
  displayName: string;
  avatarInitial: string;
  children: React.ReactNode;
}

export default function SuperAdminShellClient({
  displayName,
  avatarInitial,
  children,
}: SuperAdminShellClientProps) {
  const pathname = usePathname();
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isSearchOpen, setIsSearchOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [searchResults, setSearchResults] = useState<
    Awaited<ReturnType<typeof platformTenantSearchAction>>['results']
  >([]);
  const [searchLoading, setSearchLoading] = useState(false);

  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

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
      const res = await platformTenantSearchAction({ query: q });
      setSearchResults(res.success ? res.results || [] : []);
      setSearchLoading(false);
    }, 300);
    return () => clearTimeout(timer);
  }, [searchQuery, isSearchOpen]);

  const navLinkClass = (active: boolean) =>
    `flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
      active
        ? 'bg-primary/20 text-primary border border-primary/30'
        : 'text-on-surface-variant hover:text-on-surface hover:bg-surface-container-high'
    }`;

  const sidebarHeader = (
    <div className="h-16 flex items-center px-6 gap-2.5 border-b border-outline-variant">
      <div className="w-8 h-8 bg-primary-container flex items-center justify-center rounded-xl">
        <Stethoscope className="w-4 h-4 text-on-primary" />
      </div>
      <div>
        <span className="font-bold text-sm text-on-surface block font-[family-name:var(--font-display)]">
          ClinixDev Central
        </span>
        <span className="text-[9px] text-on-surface-variant uppercase tracking-wider flex items-center gap-1">
          <Shield className="w-3 h-3 text-primary" />
          Platform Admin
        </span>
      </div>
    </div>
  );

  return (
    <div className="min-h-screen bg-surface flex flex-col mesh-gradient">
      {isSearchOpen && (
        <div className="fixed inset-0 bg-black/60 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4">
          <div className="glass-panel w-full max-w-xl overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-outline-variant">
              <Search className="w-5 h-5 text-outline" />
              <input
                type="text"
                placeholder="Search clinics by name or slug..."
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
                  <p className="text-xs text-on-surface-variant text-center py-6">No clinics found</p>
                ) : (
                  <ul className="divide-y divide-outline-variant/50">
                    {searchResults?.map((r) => (
                      <li key={r.id}>
                        <DashboardNavLink
                          href={r.href}
                          onClick={() => setIsSearchOpen(false)}
                          className="block px-3 py-2.5 hover:bg-surface-container-high rounded-lg"
                        >
                          <span className="text-[9px] uppercase text-primary font-bold">
                            {r.type}
                          </span>
                          <p className="text-xs font-semibold text-on-surface">{r.title}</p>
                          <p className="text-[10px] text-on-surface-variant">{r.subtitle}</p>
                        </DashboardNavLink>
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
          {sidebarHeader}
          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const isActive = isNavActive(pathname, item.href);
              const Icon = item.icon;
              return (
                <DashboardNavLink
                  key={item.name}
                  href={item.href}
                  className={`${navLinkClass(isActive)} relative`}
                >
                  {isActive && (
                    <span className="absolute left-0 top-1/2 -translate-y-1/2 w-1 h-6 bg-primary rounded-r-full" />
                  )}
                  <Icon className="w-4 h-4" />
                  {item.name}
                </DashboardNavLink>
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
                  <span className="text-[9px] text-on-surface-variant block">Super Admin</span>
                </div>
              </div>
              <LogoutButton className="text-on-surface-variant hover:text-destructive p-1.5 rounded-lg hover:bg-surface-container-high transition-colors" />
            </div>
          </div>
        </aside>

        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            <div className="fixed inset-0 bg-black/50" onClick={() => setIsMobileMenuOpen(false)} />
            <aside className="relative w-64 bg-surface-container h-full z-10 border-r border-outline-variant flex flex-col">
              <div className="h-16 flex items-center px-6 justify-between border-b border-outline-variant">
                <div className="flex items-center gap-2.5 min-w-0">
                  <div className="w-8 h-8 bg-primary-container flex items-center justify-center rounded-xl shrink-0">
                    <Stethoscope className="w-4 h-4 text-on-primary" />
                  </div>
                  <span className="font-bold text-sm text-on-surface truncate">ClinixDev Central</span>
                </div>
                <button type="button" onClick={() => setIsMobileMenuOpen(false)}>
                  <X className="w-5 h-5 text-on-surface-variant" />
                </button>
              </div>
              <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
                {NAV_ITEMS.map((item) => {
                  const Icon = item.icon;
                  return (
                    <DashboardNavLink
                      key={item.name}
                      href={item.href}
                      className={navLinkClass(isNavActive(pathname, item.href))}
                      onClick={() => setIsMobileMenuOpen(false)}
                    >
                      <Icon className="w-4 h-4" />
                      {item.name}
                    </DashboardNavLink>
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
              <span className="text-xs font-bold text-on-surface-variant uppercase tracking-wider hidden sm:block">
                Platform operations
              </span>
            </div>

            <div className="flex items-center gap-3">
              <button
                type="button"
                onClick={() => setIsSearchOpen(true)}
                className="flex items-center gap-2 px-3 py-1.5 glass rounded-xl text-xs text-outline md:w-40"
                aria-label="Search clinic tenants"
              >
                <Search className="w-3.5 h-3.5" />
                <span className="hidden md:inline">Search</span>
              </button>
              <span className="hidden lg:inline text-[9px] font-semibold text-on-surface-variant/50 border border-outline-variant/40 px-1.5 py-0.5 rounded">
                ⌘K
              </span>
              <div className="lg:hidden">
                <LogoutButton className="text-on-surface-variant hover:text-destructive p-1.5 rounded-lg" />
              </div>
            </div>
          </header>
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto relative">
            <NavigationLoadingOverlay />
            {children}
          </main>
        </div>
      </div>
    </div>
  );
}
