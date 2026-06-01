'use client';

import React, { useState, useEffect } from 'react';
import Link from 'next/link';
import { usePathname, useRouter } from 'next/navigation';
import { type UserSessionDetails } from '@/lib/services/auth';
import { logoutAction } from '@/lib/services/auth-actions';
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
  Heart
} from 'lucide-react';

interface DashboardShellClientProps {
  session: UserSessionDetails;
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
  const [isMobileMenuOpen, setIsMobileMenuOpen] = useState(false);
  const [isBranchDropdownOpen, setIsBranchDropdownOpen] = useState(false);
  const [searchQuery, setSearchQuery] = useState('');
  const [isSearchOpen, setIsSearchOpen] = useState(false);

  // Close menus on page navigation
  useEffect(() => {
    setIsMobileMenuOpen(false);
  }, [pathname]);

  const activeBranch = session.branches.find((b) => b.id === activeBranchId) || session.branches[0];

  const handleBranchChange = (branchId: string) => {
    // Write cookie to store selection
    document.cookie = `vetflow_branch_id=${branchId}; path=/; max-age=${30 * 24 * 60 * 60}; SameSite=Lax`;
    setIsBranchDropdownOpen(false);
    router.refresh();
  };

  const handleLogout = async () => {
    await logoutAction();
  };

  // Define navigation items based on role
  const navItems = [
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
  ];

  // Admin-only sections
  if (['clinic_admin', 'super_admin'].includes(session.role || '')) {
    navItems.push(
      { name: 'Branches', href: '/dashboard/branches', icon: MapPin },
      { name: 'Staff', href: '/dashboard/staff', icon: Users },
      { name: 'Settings', href: '/dashboard/settings', icon: Settings }
    );
  }

  // Keyboard shortcut listener for Global Search (Cmd+K / Ctrl+K)
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

  return (
    <div className="min-h-screen bg-primary-ivory flex flex-col font-sans">
      
      {/* GLOBAL SEARCH DIALOG */}
      {isSearchOpen && (
        <div className="fixed inset-0 bg-primary-navy/40 backdrop-blur-sm z-50 flex items-start justify-center pt-24 px-4">
          <div className="bg-white w-full max-w-xl rounded-2xl shadow-premium border border-border/40 overflow-hidden">
            <div className="p-4 flex items-center gap-3 border-b border-border/40">
              <Search className="w-5 h-5 text-graphite/40" />
              <input 
                type="text" 
                placeholder="Search customers, pets, invoices, appointments..." 
                className="w-full text-sm outline-none text-primary-navy placeholder-graphite/40"
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                autoFocus
              />
              <button 
                onClick={() => setIsSearchOpen(false)}
                className="text-[10px] font-semibold bg-primary-ivory px-2 py-1 rounded text-graphite/60 border border-border/40 hover:bg-border/20 transition-colors"
              >
                ESC
              </button>
            </div>
            <div className="p-4 max-h-72 overflow-y-auto text-xs text-graphite/60">
              {searchQuery ? (
                <div className="space-y-2">
                  <p className="font-semibold text-primary-navy">Search Results</p>
                  <div className="p-3 bg-primary-ivory/30 rounded-xl hover:bg-primary-teal/5 transition-colors cursor-pointer border border-border/25">
                    <span className="font-bold text-primary-navy block">John Doe (Customer)</span>
                    <span className="text-[10px]">Owner of Max & Bella • Phone: 555-9090</span>
                  </div>
                  <div className="p-3 bg-primary-ivory/30 rounded-xl hover:bg-primary-teal/5 transition-colors cursor-pointer border border-border/25">
                    <span className="font-bold text-primary-navy block">Max (Pet)</span>
                    <span className="text-[10px]">Dog (Golden Retriever) • Owner: John Doe</span>
                  </div>
                </div>
              ) : (
                <p className="text-center py-6">Type to search the clinic database...</p>
              )}
            </div>
          </div>
        </div>
      )}

      {/* CORE CONTAINER */}
      <div className="flex flex-1 relative">
        
        {/* DESKTOP SIDEBAR */}
        <aside className="hidden lg:flex w-64 bg-primary-navy text-white flex-col justify-between border-r border-white/5 sticky top-0 h-screen z-20">
          <div className="flex flex-col flex-1 overflow-y-auto">
            {/* BRAND LOGO */}
            <div className="h-16 flex items-center px-6 gap-2.5 border-b border-white/5">
              <div className="w-8 h-8 bg-primary-teal flex items-center justify-center rounded-xl">
                <Stethoscope className="w-4.5 h-4.5 text-white" />
              </div>
              <div>
                <span className="font-bold text-sm tracking-tight text-white block">VetFlow</span>
                <span className="text-[9px] text-white/50 block font-medium uppercase tracking-wider">
                  {session.organizationName || 'Platform Owner'}
                </span>
              </div>
            </div>

            {/* NAVIGATION LINKS */}
            <nav className="flex-1 py-6 px-4 space-y-1">
              {navItems.map((item) => {
                const isActive = pathname === item.href;
                const Icon = item.icon;
                return (
                  <Link
                    key={item.name}
                    href={item.href}
                    className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold tracking-wide transition-all duration-200 ${
                      isActive 
                        ? 'bg-primary-teal text-white shadow-sm font-bold' 
                        : 'text-white/60 hover:text-white hover:bg-white/5'
                    }`}
                  >
                    <Icon className={`w-4 h-4 ${isActive ? 'text-white' : 'text-white/50'}`} />
                    {item.name}
                  </Link>
                );
              })}
            </nav>
          </div>

          {/* USER PROFILE INFO BLOCK */}
          <div className="p-4 border-t border-white/5 bg-white/[0.02]">
            <div className="flex items-center justify-between gap-2">
              <div className="flex items-center gap-3 min-w-0">
                <div className="w-8 h-8 rounded-xl bg-primary-teal/20 text-primary-teal-light flex items-center justify-center font-bold text-xs uppercase border border-primary-teal/20">
                  {session.firstName[0]}
                </div>
                <div className="min-w-0">
                  <span className="text-[11px] font-bold text-white block truncate">
                    {session.firstName} {session.lastName}
                  </span>
                  <span className="text-[9px] text-white/40 block capitalize">
                    {session.role?.replace('_', ' ')}
                  </span>
                </div>
              </div>
              <button 
                onClick={handleLogout}
                className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                title="Sign Out"
              >
                <LogOut className="w-4 h-4" />
              </button>
            </div>
          </div>
        </aside>

        {/* MOBILE SIDEBAR PANEL */}
        {isMobileMenuOpen && (
          <div className="fixed inset-0 z-40 lg:hidden flex">
            {/* Overlay */}
            <div 
              className="fixed inset-0 bg-primary-navy/40 backdrop-blur-xs" 
              onClick={() => setIsMobileMenuOpen(false)}
            />
            {/* Drawer */}
            <aside className="relative w-64 bg-primary-navy text-white flex flex-col justify-between h-full z-10 border-r border-white/5">
              <div className="flex flex-col flex-1 overflow-y-auto">
                <div className="h-16 flex items-center px-6 justify-between border-b border-white/5">
                  <div className="flex items-center gap-2">
                    <Stethoscope className="w-5 h-5 text-primary-teal" />
                    <span className="font-bold text-sm tracking-tight">VetFlow</span>
                  </div>
                  <button onClick={() => setIsMobileMenuOpen(false)}>
                    <X className="w-5 h-5 text-white/60 hover:text-white" />
                  </button>
                </div>

                <nav className="flex-1 py-6 px-4 space-y-1">
                  {navItems.map((item) => {
                    const isActive = pathname === item.href;
                    const Icon = item.icon;
                    return (
                      <Link
                        key={item.name}
                        href={item.href}
                        className={`flex items-center gap-3 px-4 py-3 rounded-xl text-xs font-semibold transition-all ${
                          isActive 
                            ? 'bg-primary-teal text-white shadow-sm' 
                            : 'text-white/60 hover:text-white hover:bg-white/5'
                        }`}
                      >
                        <Icon className="w-4 h-4" />
                        {item.name}
                      </Link>
                    );
                  })}
                </nav>
              </div>

              <div className="p-4 border-t border-white/5 flex items-center justify-between">
                <div className="flex items-center gap-3">
                  <div className="w-8 h-8 rounded-xl bg-primary-teal/20 text-primary-teal-light flex items-center justify-center font-bold text-xs uppercase">
                    {session.firstName[0]}
                  </div>
                  <div>
                    <span className="text-[11px] font-bold text-white block">
                      {session.firstName}
                    </span>
                    <span className="text-[9px] text-white/40 block capitalize">
                      {session.role}
                    </span>
                  </div>
                </div>
                <button 
                  onClick={handleLogout}
                  className="text-white/40 hover:text-red-400 p-1.5 rounded-lg hover:bg-white/5 transition-colors"
                >
                  <LogOut className="w-4 h-4" />
                </button>
              </div>
            </aside>
          </div>
        )}

        {/* CONTENT SHELL CONTAINER */}
        <div className="flex-1 flex flex-col min-w-0">
          
          {/* TOP BAR */}
          <header className="h-16 border-b border-border/40 bg-white px-6 flex items-center justify-between sticky top-0 z-10">
            <div className="flex items-center gap-4">
              {/* Hamburger */}
              <button 
                className="lg:hidden p-1 rounded hover:bg-primary-ivory text-graphite"
                onClick={() => setIsMobileMenuOpen(true)}
              >
                <Menu className="w-5 h-5" />
              </button>

              {/* BRANCH SELECTOR DROPDOWN */}
              {session.branches.length > 0 ? (
                <div className="relative">
                  <button 
                    onClick={() => setIsBranchDropdownOpen(!isBranchDropdownOpen)}
                    className="flex items-center gap-2 px-3 py-1.5 bg-primary-ivory border border-border/60 rounded-xl hover:border-primary-teal text-xs text-primary-navy font-bold transition-all"
                  >
                    <MapPin className="w-3.5 h-3.5 text-primary-teal" />
                    <span>{activeBranch?.name || 'Select Branch'}</span>
                    <ChevronDown className="w-3 h-3 text-graphite/40" />
                  </button>

                  {isBranchDropdownOpen && (
                    <>
                      <div className="fixed inset-0 z-20" onClick={() => setIsBranchDropdownOpen(false)} />
                      <div className="absolute left-0 mt-2 w-56 bg-white border border-border/40 rounded-2xl shadow-premium z-30 py-1.5 overflow-hidden">
                        <span className="block px-4 py-1.5 text-[9px] font-semibold text-graphite/40 uppercase tracking-wider">
                          Switch Branch Scope
                        </span>
                        {session.branches.map((b) => (
                          <button
                            key={b.id}
                            onClick={() => handleBranchChange(b.id)}
                            className={`w-full text-left px-4 py-2 text-xs font-semibold flex items-center justify-between hover:bg-primary-ivory transition-colors ${
                              b.id === activeBranchId ? 'text-primary-teal font-bold' : 'text-primary-navy'
                            }`}
                          >
                            {b.name}
                            {b.id === activeBranchId && (
                              <span className="w-1.5 h-1.5 rounded-full bg-primary-teal"></span>
                            )}
                          </button>
                        ))}
                      </div>
                    </>
                  )}
                </div>
              ) : (
                <div className="flex items-center gap-2 text-xs text-graphite/50">
                  <MapPin className="w-3.5 h-3.5" />
                  <span>No branches assigned</span>
                </div>
              )}
            </div>

            {/* SEARCH AND NOTIFICATIONS */}
            <div className="flex items-center gap-4">
              {/* Keyboard Shortcut Search trigger */}
              <button 
                onClick={() => setIsSearchOpen(true)}
                className="hidden md:flex items-center gap-3 px-3 py-1.5 bg-primary-ivory border border-border/40 rounded-xl hover:border-primary-teal transition-all text-left text-xs text-graphite/50 w-48"
              >
                <Search className="w-3.5 h-3.5 text-graphite/40" />
                <span>Search...</span>
                <kbd className="ml-auto font-mono text-[9px] bg-white border border-border/40 px-1.5 py-0.5 rounded text-graphite/45">
                  Ctrl K
                </kbd>
              </button>

              <button className="p-2 bg-primary-ivory border border-border/40 rounded-xl hover:border-primary-teal text-graphite/60 hover:text-primary-teal transition-all relative">
                <Bell className="w-4 h-4" />
                <span className="absolute top-1 right-1 w-1.5 h-1.5 bg-accent rounded-full"></span>
              </button>
            </div>
          </header>

          {/* MAIN PAGE VIEWPORT */}
          <main className="flex-1 p-6 md:p-8 max-w-7xl w-full mx-auto">
            {children}
          </main>

        </div>

      </div>

    </div>
  );
}
