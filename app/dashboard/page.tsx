import { resolveServerAuthContext } from '@/lib/auth/context';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/credentials';
import {
  MOCK_DASHBOARD_KPIS,
  MOCK_LOW_STOCK_ITEMS,
  MOCK_RECENT_VISITS,
} from '@/lib/demo/mock-data';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ClipboardList,
  Receipt,
  AlertTriangle,
  ArrowRight,
  Plus,
  TrendingUp,
  Users,
  Heart,
  Stethoscope,
  Activity,
  Clock,
} from 'lucide-react';

export const metadata = {
  title: 'VetFlow Dashboard — Overview',
  description: 'Clinic overview with key performance indicators and quick actions.',
};

export default async function DashboardOverview() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.isSuperAdmin) redirect('/super-admin/dashboard');

  const session = ctx;
  const activeBranchId = ctx.activeBranchId;

  if (!activeBranchId) {
    const greeting = getGreeting();
    return (
      <div className="space-y-8">
        <div className="relative overflow-hidden rounded-3xl bg-gradient-to-br from-primary-navy via-[hsl(222,47%,16%)] to-primary-teal p-8 md:p-10 text-white">
          <div className="relative z-10">
            <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
              {greeting}, {session.firstName || 'User'}
            </h1>
            <p className="text-sm text-white/60 mt-2 max-w-lg">
              Your account is not assigned to a clinic branch yet.
            </p>
          </div>
        </div>
        <div className="bg-amber-500/5 border border-amber-500/20 text-amber-700 text-sm p-6 rounded-2xl">
          You must be assigned to a clinic branch to view dashboard metrics. Please contact your clinic
          administrator to get branch access.
        </div>
      </div>
    );
  }

  // Parallel data fetching for KPIs
  const today = new Date().toISOString().split('T')[0];

  let todayAppointments = 0;
  let waitingWalkIns = 0;
  let unpaidInvoices = 0;
  let lowStockItems: any[] = [];
  let recentVisits: any[] = [];
  let totalCustomers = 0;
  let totalPets = 0;

  if (isDemoMode()) {
    todayAppointments = MOCK_DASHBOARD_KPIS.todayAppointments;
    waitingWalkIns = MOCK_DASHBOARD_KPIS.waitingWalkIns;
    unpaidInvoices = MOCK_DASHBOARD_KPIS.unpaidInvoices;
    lowStockItems = MOCK_LOW_STOCK_ITEMS;
    recentVisits = MOCK_RECENT_VISITS;
    totalCustomers = MOCK_DASHBOARD_KPIS.totalCustomers;
    totalPets = MOCK_DASHBOARD_KPIS.totalPets;
  } else {
    const supabase = await createClient();

    const [appointmentsRes, walkInsRes, invoicesRes, lowStockRes, recentVisitsRes, customersRes, petsRes] =
      await Promise.all([
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('preferred_date', today),
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .in('status', ['waiting', 'consulting']),
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('payment_status', 'unpaid'),
        supabase
          .from('products')
          .select('id, name, stock_quantity, reorder_level')
          .eq('branch_id', activeBranchId)
          .eq('is_active', true)
          .filter('stock_quantity', 'lte', 'reorder_level')
          .limit(5),
        supabase
          .from('visits')
          .select(`
            id, reason, status, checked_in_at,
            pets ( name, species ),
            customers ( first_name, last_name )
          `)
          .eq('branch_id', activeBranchId)
          .order('checked_in_at', { ascending: false })
          .limit(5),
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId),
        supabase
          .from('pets')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', session.organizationId || ''),
      ]);

    todayAppointments = appointmentsRes.count || 0;
    waitingWalkIns = walkInsRes.count || 0;
    unpaidInvoices = invoicesRes.count || 0;
    lowStockItems = lowStockRes.data || [];
    recentVisits = recentVisitsRes.data || [];
    totalCustomers = customersRes.count || 0;
    totalPets = petsRes.count || 0;
  }

  const greeting = getGreeting();
  const roleQuickLinks =
    session.role === 'doctor'
      ? [
          { href: '/dashboard/doctors', label: 'Clinical queue' },
          { href: '/dashboard/prescriptions', label: 'Prescriptions' },
        ]
      : session.role === 'receptionist'
        ? [
            { href: '/dashboard/walk-ins', label: 'Walk-in intake' },
            { href: '/dashboard/appointments', label: 'Appointments' },
            { href: '/dashboard/invoices', label: 'Billing' },
          ]
        : [
            { href: '/dashboard/staff', label: 'Manage staff' },
            { href: '/dashboard/reports', label: 'Reports' },
            { href: '/dashboard/upgrade', label: 'Upgrade plan' },
          ];

  return (
    <div className="space-y-8">
      <div className="relative overflow-hidden rounded-3xl glass-panel border-primary/20 p-8 md:p-10 mesh-gradient">
        <div className="absolute inset-0 opacity-10">
          <div className="absolute top-4 right-8 w-32 h-32 rounded-full bg-primary blur-3xl" />
          <div className="absolute bottom-0 left-12 w-48 h-48 rounded-full bg-gold blur-3xl" />
        </div>
        <div className="relative z-10">
          <div className="flex items-center gap-2 mb-2">
            <Activity className="w-4 h-4 text-primary-light" />
            <span className="text-[10px] font-bold uppercase tracking-widest text-primary-light">
              Clinic Dashboard
            </span>
          </div>
          <h1 className="text-2xl md:text-3xl font-extrabold tracking-tight">
            {greeting}, {session.firstName}
          </h1>
          <p className="text-sm text-on-surface-variant mt-2 max-w-lg">
            {session.organizationName
              ? `Managing ${session.organizationName}. Here's your clinic performance at a glance.`
              : "Here's your clinic performance at a glance."}
          </p>
          <div className="flex flex-wrap gap-2 mt-4">
            {roleQuickLinks.map((link) => (
              <Link
                key={link.href}
                href={link.href}
                className="text-[10px] font-bold px-3 py-1.5 rounded-full bg-primary/15 text-primary border border-primary/25 hover:bg-primary/25"
              >
                {link.label}
              </Link>
            ))}
          </div>
        </div>
      </div>

      {/* KPI STAT CARDS */}
      <div className="grid grid-cols-2 lg:grid-cols-4 gap-4 md:gap-6">
        <StatCard
          icon={<Calendar className="w-5 h-5" />}
          label="Today's Appointments"
          value={todayAppointments}
          color="teal"
          href="/dashboard/appointments"
        />
        <StatCard
          icon={<ClipboardList className="w-5 h-5" />}
          label="Walk-ins Waiting"
          value={waitingWalkIns}
          color="amber"
          href="/dashboard/walk-ins"
        />
        <StatCard
          icon={<Receipt className="w-5 h-5" />}
          label="Unpaid Invoices"
          value={unpaidInvoices}
          color="rose"
          href="/dashboard/invoices"
        />
        <StatCard
          icon={<AlertTriangle className="w-5 h-5" />}
          label="Low Stock Alerts"
          value={lowStockItems.length}
          color="orange"
          href="/dashboard/inventory"
        />
      </div>

      {/* SECONDARY STATS */}
      <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
            <Users className="w-5 h-5 text-primary" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">Total Customers</span>
            <span className="text-xl font-black text-on-surface">{totalCustomers}</span>
          </div>
        </div>
        <div className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-gold/10 flex items-center justify-center">
            <Heart className="w-5 h-5 text-gold" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">Total Pets</span>
            <span className="text-xl font-black text-on-surface">{totalPets}</span>
          </div>
        </div>
        <div className="col-span-2 lg:col-span-1 glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium flex items-center gap-4">
          <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
            <TrendingUp className="w-5 h-5 text-emerald-600" />
          </div>
          <div>
            <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">Active Branch</span>
            <span className="text-sm font-bold text-on-surface truncate block">
              {session.branches.find((b) => b.id === activeBranchId)?.name || 'No branch'}
            </span>
          </div>
        </div>
      </div>

      {/* QUICK ACTIONS + RECENT ACTIVITY */}
      <div className="grid lg:grid-cols-12 gap-6">
        {/* QUICK ACTIONS */}
        <div className="lg:col-span-4 space-y-4">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">Quick Actions</h3>
          <div className="space-y-3">
            <QuickAction
              href="/dashboard/walk-ins"
              icon={<ClipboardList className="w-4 h-4" />}
              label="Check-in Walk-in"
              description="Register a new patient visit"
            />
            <QuickAction
              href="/dashboard/appointments"
              icon={<Calendar className="w-4 h-4" />}
              label="View Appointments"
              description="Manage today's bookings"
            />
            <QuickAction
              href="/dashboard/customers"
              icon={<Plus className="w-4 h-4" />}
              label="Add Customer"
              description="Register a new client & pet"
            />
            <QuickAction
              href="/dashboard/inventory"
              icon={<Stethoscope className="w-4 h-4" />}
              label="Manage Inventory"
              description="Check stock levels & products"
            />
          </div>
        </div>

        {/* RECENT VISITS */}
        <div className="lg:col-span-8">
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">Recent Activity</h3>
          <div className="glass-panel rounded-2xl border border-outline-variant/40 shadow-premium overflow-hidden">
            {recentVisits.length > 0 ? (
              <div className="divide-y divide-border/20">
                {recentVisits.map((visit: any) => (
                  <div
                    key={visit.id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-surface-container/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(visit.status)}`} />
                      <div>
                        <span className="text-xs font-bold text-on-surface block">
                          {visit.pets?.name || 'Unknown Pet'}{' '}
                          <span className="text-on-surface-variant/40 font-normal">
                            ({visit.pets?.species || 'N/A'})
                          </span>
                        </span>
                        <span className="text-[10px] text-on-surface-variant/50 block">
                          Owner: {visit.customers?.first_name} {visit.customers?.last_name} •{' '}
                          {visit.reason?.substring(0, 40)}{visit.reason?.length > 40 ? '...' : ''}
                        </span>
                      </div>
                    </div>
                    <div className="flex items-center gap-3">
                      <span
                        className={`text-[10px] font-bold px-2 py-0.5 rounded-full capitalize ${getStatusBadge(
                          visit.status
                        )}`}
                      >
                        {visit.status?.replace('_', ' ')}
                      </span>
                      <span className="text-[10px] text-on-surface-variant/40 flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(visit.checked_in_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <div className="p-10 text-center">
                <Activity className="w-8 h-8 text-on-surface-variant/20 mx-auto mb-3" />
                <p className="text-xs text-on-surface-variant/40">No recent visits recorded for this branch.</p>
                <Link
                  href="/dashboard/walk-ins"
                  className="text-xs text-primary font-semibold mt-2 inline-block hover:underline"
                >
                  Check in your first walk-in →
                </Link>
              </div>
            )}
          </div>
        </div>
      </div>

      {/* LOW STOCK ALERTS */}
      {lowStockItems.length > 0 && (
        <div className="bg-amber-50 rounded-2xl border border-amber-200/60 p-6 shadow-premium">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-600" />
            <h3 className="text-xs font-bold text-amber-800 uppercase tracking-wider">
              Low Stock Alerts
            </h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item: any) => (
              <div
                key={item.id}
                className="glass-panel rounded-xl border border-amber-200/40 px-4 py-3 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-on-surface">{item.name}</span>
                <span className="text-[10px] font-bold text-amber-700 bg-amber-100 px-2 py-0.5 rounded-full">
                  {item.stock_quantity} / {item.reorder_level} min
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/inventory"
            className="text-xs font-semibold text-amber-700 hover:text-amber-900 mt-3 inline-flex items-center gap-1"
          >
            View full inventory <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

// ——— Helper Components ———

function StatCard({
  icon,
  label,
  value,
  color,
  href,
}: {
  icon: React.ReactNode;
  label: string;
  value: number;
  color: 'teal' | 'amber' | 'rose' | 'orange';
  href: string;
}) {
  const colorMap = {
    teal: { bg: 'bg-primary/10', text: 'text-primary', value: 'text-primary' },
    amber: { bg: 'bg-amber-500/10', text: 'text-amber-600', value: 'text-amber-600' },
    rose: { bg: 'bg-rose-500/10', text: 'text-rose-600', value: 'text-rose-600' },
    orange: { bg: 'bg-orange-500/10', text: 'text-orange-600', value: 'text-orange-600' },
  };
  const c = colorMap[color];

  return (
    <Link
      href={href}
      className="glass-panel rounded-2xl border border-outline-variant/40 p-5 shadow-premium hover:shadow-premium-hover transition-all duration-200 group"
    >
      <div className="flex items-center justify-between mb-3">
        <div className={`w-10 h-10 ${c.bg} rounded-xl flex items-center justify-center ${c.text}`}>
          {icon}
        </div>
        <ArrowRight className="w-4 h-4 text-on-surface-variant/20 group-hover:text-primary transition-colors" />
      </div>
      <span className="text-[10px] font-bold text-on-surface-variant/40 uppercase block">{label}</span>
      <span className={`text-2xl font-black ${c.value} mt-0.5 block`}>{value}</span>
    </Link>
  );
}

function QuickAction({
  href,
  icon,
  label,
  description,
}: {
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
}) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 glass-panel rounded-2xl border border-outline-variant/40 p-4 shadow-premium hover:shadow-premium-hover hover:border-primary-teal/30 transition-all duration-200 group"
    >
      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-white transition-all">
        {icon}
      </div>
      <div>
        <span className="text-xs font-bold text-on-surface block">{label}</span>
        <span className="text-[10px] text-on-surface-variant/50">{description}</span>
      </div>
    </Link>
  );
}

// ——— Utility functions ———

function getGreeting() {
  const hour = new Date().getHours();
  if (hour < 12) return 'Good morning';
  if (hour < 17) return 'Good afternoon';
  return 'Good evening';
}

function getStatusColor(status: string) {
  switch (status) {
    case 'waiting':
      return 'bg-amber-500';
    case 'consulting':
      return 'bg-blue-500';
    case 'ready_for_checkout':
      return 'bg-emerald-500';
    case 'completed':
      return 'bg-graphite/30';
    case 'cancelled':
      return 'bg-red-400';
    default:
      return 'bg-graphite/20';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'waiting':
      return 'bg-amber-100 text-amber-700';
    case 'consulting':
      return 'bg-blue-100 text-blue-700';
    case 'ready_for_checkout':
      return 'bg-emerald-100 text-emerald-700';
    case 'completed':
      return 'bg-graphite/10 text-on-surface-variant/60';
    case 'cancelled':
      return 'bg-red-100 text-red-600';
    default:
      return 'bg-graphite/10 text-on-surface-variant/60';
  }
}

function formatTime(isoString: string) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}

