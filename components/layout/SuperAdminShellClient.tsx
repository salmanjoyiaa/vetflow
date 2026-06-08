'use client';

import React, { useState } from 'react';
import Link from 'next/link';
import { usePathname } from 'next/navigation';
import { logoutAction } from '@/lib/services/auth-actions';
import type { LucideIcon } from 'lucide-react';
import {
  Stethoscope,
  LayoutDashboard,
  Building2,
  CreditCard,
  ScrollText,
  LogOut,
  Menu,
  X,
  Shield,
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
  { name: 'Audit log', href: '/super-admin/audit', icon: ScrollText },
];

function isNavActive(pathname: string, href: string): boolean {
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
      <div className="flex flex-1 relative">
        <aside className="hidden lg:flex w-64 bg-surface-container border-r border-outline-variant flex-col sticky top-0 h-screen z-20">
          {sidebarHeader}
          <nav className="flex-1 py-6 px-4 space-y-1 overflow-y-auto">
            {NAV_ITEMS.map((item) => {
              const Icon = item.icon;
              return (
                <Link
                  key={item.name}
                  href={item.href}
                  className={navLinkClass(isNavActive(pathname, item.href))}
                >
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
                  <span className="text-[9px] text-on-surface-variant block">Super Admin</span>
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
                    <Link
                      key={item.name}
                      href={item.href}
                      className={navLinkClass(isNavActive(pathname, item.href))}
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
            <form action={logoutAction} className="lg:hidden">
              <button
                type="submit"
                className="text-xs font-bold text-on-surface-variant hover:text-destructive flex items-center gap-1"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </form>
          </header>
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">{children}</main>
        </div>
      </div>
    </div>
  );
}
