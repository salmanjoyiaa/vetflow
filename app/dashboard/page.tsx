import { resolveServerAuthContext } from '@/lib/auth/context';
import { canShowWidget } from '@/lib/auth/capabilities';
import { createClient } from '@/lib/supabase/server';
import { isDemoMode } from '@/lib/demo/credentials';
import {
  MOCK_DASHBOARD_KPIS,
  MOCK_LOW_STOCK_ITEMS,
  MOCK_RECENT_VISITS,
} from '@/lib/demo/mock-data';
import { getActiveBranchName } from '@/lib/dashboard/resolve-active-branch';
import RoleDashboardHero, {
  type QuickLink,
} from '@/components/dashboard/RoleDashboardHero';
import DashboardWidgetGrid, {
  type DashboardKpi,
} from '@/components/dashboard/DashboardWidgetGrid';
import EmptyState from '@/components/ui/premium/EmptyState';
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
  FileText,
  BriefcaseMedical,
} from 'lucide-react';
import type { UserSessionDetails } from '@/lib/services/auth';

export const metadata = {
  title: 'VetFlow Dashboard — Overview',
  description: 'Clinic overview with key performance indicators and quick actions.',
};

type VisitRow = {
  id: string;
  reason: string | null;
  status: string;
  checked_in_at: string | null;
  pets: { name: string; species: string } | null;
  customers: { first_name: string; last_name: string } | null;
};

export default async function DashboardOverview() {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');
  if (ctx.isSuperAdmin) redirect('/super-admin/dashboard');

  const session = ctx;
  const activeBranchId = ctx.activeBranchId;
  const role = session.role;

  if (!activeBranchId) {
    return (
      <div className="space-y-8">
        <RoleDashboardHero
          firstName={session.firstName || 'User'}
          organizationName={session.organizationName}
          role={role}
          quickLinks={[]}
        />
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm p-6 rounded-2xl">
          You must be assigned to a clinic branch to view dashboard metrics. Please contact your
          clinic administrator to get branch access.
        </div>
      </div>
    );
  }

  const today = new Date().toISOString().split('T')[0];

  let todayAppointments = 0;
  let waitingWalkIns = 0;
  let unpaidInvoices = 0;
  let lowStockItems: { id: string; name: string; stock_quantity: number; reorder_level: number }[] =
    [];
  let recentVisits: VisitRow[] = [];
  let totalCustomers = 0;
  let totalPets = 0;
  let readyForCheckout = 0;
  let myQueueCount = 0;
  let activeConsultations = 0;
  let emergencyCount = 0;
  let openPrescriptions = 0;

  if (isDemoMode()) {
    todayAppointments = MOCK_DASHBOARD_KPIS.todayAppointments;
    waitingWalkIns = MOCK_DASHBOARD_KPIS.waitingWalkIns;
    unpaidInvoices = MOCK_DASHBOARD_KPIS.unpaidInvoices;
    lowStockItems = MOCK_LOW_STOCK_ITEMS;
    recentVisits = MOCK_RECENT_VISITS as VisitRow[];
    totalCustomers = MOCK_DASHBOARD_KPIS.totalCustomers;
    totalPets = MOCK_DASHBOARD_KPIS.totalPets;
    myQueueCount = 2;
    activeConsultations = 1;
    emergencyCount = 1;
    openPrescriptions = 3;
  } else {
    const supabase = await createClient();
    const queries: Promise<void>[] = [];

    if (canShowWidget(role, 'todayAppointments')) {
      queries.push(
        supabase
          .from('appointments')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('preferred_date', today)
          .then((r) => {
            todayAppointments = r.count || 0;
          })
      );
    }

    if (canShowWidget(role, 'waitingWalkIns')) {
      queries.push(
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .in('status', ['waiting', 'consulting'])
          .then((r) => {
            waitingWalkIns = r.count || 0;
          })
      );
    }

    if (canShowWidget(role, 'readyForCheckout')) {
      queries.push(
        supabase
          .from('visits')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('status', 'ready_for_checkout')
          .then((r) => {
            readyForCheckout = r.count || 0;
          })
      );
    }

    if (canShowWidget(role, 'unpaidInvoices')) {
      queries.push(
        supabase
          .from('invoices')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('payment_status', 'unpaid')
          .then((r) => {
            unpaidInvoices = r.count || 0;
          })
      );
    }

    if (canShowWidget(role, 'lowStock')) {
      queries.push(
        supabase
          .from('products')
          .select('id, name, stock_quantity, reorder_level')
          .eq('branch_id', activeBranchId)
          .eq('is_active', true)
          .filter('stock_quantity', 'lte', 'reorder_level')
          .limit(5)
          .then((r) => {
            lowStockItems = r.data || [];
          })
      );
    }

    if (canShowWidget(role, 'totalCustomers')) {
      queries.push(
        supabase
          .from('customers')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .then((r) => {
            totalCustomers = r.count || 0;
          })
      );
    }

    if (canShowWidget(role, 'totalPets')) {
      queries.push(
        supabase
          .from('pets')
          .select('id', { count: 'exact', head: true })
          .eq('organization_id', session.organizationId || '')
          .then((r) => {
            totalPets = r.count || 0;
          })
      );
    }

    if (canShowWidget(role, 'clinicalQueue') && role === 'doctor') {
      queries.push(
        supabase
          .from('visits')
          .select('id, visit_assignments!inner(doctor_id)', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('visit_assignments.doctor_id', session.userId)
          .in('status', ['waiting', 'consulting'])
          .then((r) => {
            myQueueCount = r.count || 0;
          })
      );
      queries.push(
        supabase
          .from('visits')
          .select('id, visit_assignments!inner(doctor_id)', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('visit_assignments.doctor_id', session.userId)
          .eq('status', 'consulting')
          .then((r) => {
            activeConsultations = r.count || 0;
          })
      );
      queries.push(
        supabase
          .from('visits')
          .select('id, visit_assignments!inner(doctor_id)', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .eq('visit_assignments.doctor_id', session.userId)
          .eq('is_emergency', true)
          .in('status', ['waiting', 'consulting'])
          .then((r) => {
            emergencyCount = r.count || 0;
          })
      );
    }

    if (canShowWidget(role, 'openPrescriptions')) {
      queries.push(
        supabase
          .from('prescriptions')
          .select('id', { count: 'exact', head: true })
          .eq('branch_id', activeBranchId)
          .then((r) => {
            openPrescriptions = r.count || 0;
          })
      );
    }

    let visitsQuery = supabase
      .from('visits')
      .select(
        `
        id, reason, status, checked_in_at, is_emergency,
        pets ( name, species ),
        customers ( first_name, last_name )
        ${role === 'doctor' ? ', visit_assignments!inner ( doctor_id )' : ''}
      `
      )
      .eq('branch_id', activeBranchId)
      .order('checked_in_at', { ascending: false })
      .limit(5);

    if (role === 'doctor') {
      visitsQuery = visitsQuery.eq('visit_assignments.doctor_id', session.userId);
    }

    queries.push(
      visitsQuery.then((r) => {
        recentVisits = (r.data as VisitRow[]) || [];
      })
    );

    await Promise.all(queries);
  }

  const quickLinks = buildQuickLinks(role, readyForCheckout);
  const kpis = buildKpis(role, {
    todayAppointments,
    waitingWalkIns,
    readyForCheckout,
    unpaidInvoices,
    lowStockCount: lowStockItems.length,
    myQueueCount,
    activeConsultations,
    emergencyCount,
    openPrescriptions,
    totalCustomers,
    totalPets,
  });
  const quickActions = buildQuickActions(role, readyForCheckout);
  const showLowStock = canShowWidget(role, 'lowStock') && lowStockItems.length > 0;
  const showSecondary =
    canShowWidget(role, 'totalCustomers') ||
    canShowWidget(role, 'totalPets') ||
    role === 'clinic_admin';

  return (
    <div className="space-y-8">
      <RoleDashboardHero
        firstName={session.firstName || 'User'}
        organizationName={session.organizationName}
        role={role}
        quickLinks={quickLinks}
      />

      {kpis.length > 0 && <DashboardWidgetGrid kpis={kpis} />}

      {showSecondary && (
        <div className="grid grid-cols-2 lg:grid-cols-3 gap-4 md:gap-6">
          {canShowWidget(role, 'totalCustomers') && (
            <SecondaryStat icon={Users} label="Total Customers" value={totalCustomers} />
          )}
          {canShowWidget(role, 'totalPets') && (
            <SecondaryStat icon={Heart} label="Total Pets" value={totalPets} />
          )}
          <div className="col-span-2 lg:col-span-1 glass-panel rounded-2xl p-5 flex items-center gap-4">
            <div className="w-10 h-10 rounded-xl bg-emerald-500/10 flex items-center justify-center">
              <TrendingUp className="w-5 h-5 text-emerald-500" />
            </div>
            <div>
              <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
                Active Branch
              </span>
              <span className="text-sm font-bold text-on-surface truncate block">
                {getActiveBranchName(ctx) || 'No branch'}
              </span>
            </div>
          </div>
        </div>
      )}

      <div className="grid lg:grid-cols-12 gap-6">
        {quickActions.length > 0 && (
          <div className="lg:col-span-4 space-y-4">
            <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider">
              Quick Actions
            </h3>
            <div className="space-y-3">
              {quickActions.map((action) => (
                <QuickAction
                  key={action.key}
                  href={action.href}
                  icon={action.icon}
                  label={action.label}
                  description={action.description}
                />
              ))}
            </div>
          </div>
        )}

        <div className={quickActions.length > 0 ? 'lg:col-span-8' : 'lg:col-span-12'}>
          <h3 className="text-xs font-bold text-on-surface uppercase tracking-wider mb-4">
            Recent Activity
          </h3>
          <div className="glass-panel rounded-2xl overflow-hidden">
            {recentVisits.length > 0 ? (
              <div className="divide-y divide-outline-variant/30">
                {recentVisits.map((visit) => (
                  <div
                    key={visit.id}
                    className="px-5 py-4 flex items-center justify-between hover:bg-surface-container/30 transition-colors"
                  >
                    <div className="flex items-center gap-4">
                      <div className={`w-2 h-2 rounded-full ${getStatusColor(visit.status)}`} />
                      <div>
                        <span className="text-xs font-bold text-on-surface block">
                          {visit.pets?.name || 'Unknown Pet'}{' '}
                          <span className="text-on-surface-variant font-normal">
                            ({visit.pets?.species || 'N/A'})
                          </span>
                        </span>
                        <span className="text-[10px] text-on-surface-variant block">
                          Owner: {visit.customers?.first_name} {visit.customers?.last_name} ·{' '}
                          {visit.reason?.substring(0, 40)}
                          {(visit.reason?.length || 0) > 40 ? '...' : ''}
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
                      <span className="text-[10px] text-on-surface-variant flex items-center gap-1">
                        <Clock className="w-3 h-3" />
                        {formatTime(visit.checked_in_at)}
                      </span>
                    </div>
                  </div>
                ))}
              </div>
            ) : (
              <EmptyState
                icon={Activity}
                title="No recent activity"
                description={
                  role === 'doctor'
                    ? 'No visits assigned to you yet today.'
                    : 'No recent visits recorded for this branch.'
                }
                action={
                  role === 'receptionist' && canShowWidget(role, 'waitingWalkIns') ? (
                    <Link
                      href="/dashboard/walk-ins"
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Check in a walk-in →
                    </Link>
                  ) : role === 'doctor' ? (
                    <Link
                      href="/dashboard/doctors"
                      className="text-xs text-primary font-semibold hover:underline"
                    >
                      Open clinical queue →
                    </Link>
                  ) : undefined
                }
              />
            )}
          </div>
        </div>
      </div>

      {showLowStock && (
        <div className="bg-amber-500/10 rounded-2xl border border-amber-500/30 p-6">
          <div className="flex items-center gap-2 mb-4">
            <AlertTriangle className="w-4 h-4 text-amber-400" />
            <h3 className="text-xs font-bold text-amber-400 uppercase tracking-wider">
              Low Stock Alerts
            </h3>
          </div>
          <div className="grid md:grid-cols-2 lg:grid-cols-3 gap-3">
            {lowStockItems.map((item) => (
              <div
                key={item.id}
                className="glass-panel rounded-xl px-4 py-3 flex items-center justify-between"
              >
                <span className="text-xs font-bold text-on-surface">{item.name}</span>
                <span className="text-[10px] font-bold text-amber-400 bg-amber-500/10 border border-amber-500/20 px-2 py-0.5 rounded-full">
                  {item.stock_quantity} / {item.reorder_level} min
                </span>
              </div>
            ))}
          </div>
          <Link
            href="/dashboard/inventory"
            className="text-xs font-semibold text-amber-400 hover:text-amber-300 mt-3 inline-flex items-center gap-1"
          >
            View full inventory <ArrowRight className="w-3 h-3" />
          </Link>
        </div>
      )}
    </div>
  );
}

function buildQuickLinks(role: UserSessionDetails['role'], readyForCheckout: number): QuickLink[] {
  if (role === 'doctor') {
    return [
      { key: 'queue', href: '/dashboard/doctors', label: 'Clinical queue' },
      { key: 'rx', href: '/dashboard/prescriptions', label: 'Prescriptions' },
      { key: 'appt', href: '/dashboard/appointments', label: 'Appointments' },
    ];
  }
  if (role === 'receptionist') {
    return [
      { key: 'walkin', href: '/dashboard/walk-ins', label: 'Walk-in intake' },
      { key: 'appt', href: '/dashboard/appointments', label: 'Appointments' },
      {
        key: 'checkout',
        href: '/dashboard/walk-ins',
        label: `Checkout queue (${readyForCheckout})`,
      },
      { key: 'billing', href: '/dashboard/invoices', label: 'Billing' },
    ];
  }
  return [
    { key: 'staff', href: '/dashboard/staff', label: 'Manage staff' },
    { key: 'reports', href: '/dashboard/reports', label: 'Reports' },
    { key: 'upgrade', href: '/dashboard/upgrade', label: 'Upgrade plan' },
  ];
}

function buildKpis(
  role: UserSessionDetails['role'],
  data: {
    todayAppointments: number;
    waitingWalkIns: number;
    readyForCheckout: number;
    unpaidInvoices: number;
    lowStockCount: number;
    myQueueCount: number;
    activeConsultations: number;
    emergencyCount: number;
    openPrescriptions: number;
    totalCustomers: number;
    totalPets: number;
  }
): DashboardKpi[] {
  const kpis: DashboardKpi[] = [];

  if (role === 'doctor') {
    if (canShowWidget(role, 'todayAppointments')) {
      kpis.push({
        key: 'appt',
        label: "Today's Appointments",
        value: data.todayAppointments,
        icon: Calendar,
        href: '/dashboard/appointments',
      });
    }
    kpis.push({
      key: 'queue',
      label: 'My Queue',
      value: data.myQueueCount,
      icon: BriefcaseMedical,
      href: '/dashboard/doctors',
    });
    kpis.push({
      key: 'active',
      label: 'Active Consultations',
      value: data.activeConsultations,
      icon: Stethoscope,
      href: '/dashboard/doctors',
    });
    kpis.push({
      key: 'emergency',
      label: 'Emergencies',
      value: data.emergencyCount,
      icon: AlertTriangle,
      href: '/dashboard/doctors',
    });
    if (canShowWidget(role, 'openPrescriptions')) {
      kpis.push({
        key: 'rx',
        label: 'Prescriptions',
        value: data.openPrescriptions,
        icon: FileText,
        href: '/dashboard/prescriptions',
      });
    }
    return kpis;
  }

  if (canShowWidget(role, 'todayAppointments')) {
    kpis.push({
      key: 'appt',
      label: "Today's Appointments",
      value: data.todayAppointments,
      icon: Calendar,
      href: '/dashboard/appointments',
    });
  }
  if (canShowWidget(role, 'waitingWalkIns')) {
    kpis.push({
      key: 'walkin',
      label: 'Walk-ins Waiting',
      value: data.waitingWalkIns,
      icon: ClipboardList,
      href: '/dashboard/walk-ins',
    });
  }
  if (canShowWidget(role, 'readyForCheckout')) {
    kpis.push({
      key: 'checkout',
      label: 'Ready for Checkout',
      value: data.readyForCheckout,
      icon: Receipt,
      href: '/dashboard/walk-ins',
    });
  }
  if (canShowWidget(role, 'unpaidInvoices')) {
    kpis.push({
      key: 'unpaid',
      label: 'Unpaid Invoices',
      value: data.unpaidInvoices,
      icon: Receipt,
      href: '/dashboard/invoices',
    });
  }
  if (canShowWidget(role, 'lowStock')) {
    kpis.push({
      key: 'stock',
      label: 'Low Stock Alerts',
      value: data.lowStockCount,
      icon: AlertTriangle,
      href: '/dashboard/inventory',
    });
  }

  return kpis.slice(0, 4);
}

type QuickActionItem = {
  key: string;
  href: string;
  icon: React.ReactNode;
  label: string;
  description: string;
};

function buildQuickActions(
  role: UserSessionDetails['role'],
  readyForCheckout: number
): QuickActionItem[] {
  if (role === 'doctor') {
    return [
      {
        key: 'queue',
        href: '/dashboard/doctors',
        icon: <BriefcaseMedical className="w-4 h-4" />,
        label: 'Clinical queue',
        description: 'View assigned patients',
      },
      {
        key: 'appt',
        href: '/dashboard/appointments',
        icon: <Calendar className="w-4 h-4" />,
        label: 'Appointments',
        description: "Today's schedule",
      },
      {
        key: 'rx',
        href: '/dashboard/prescriptions',
        icon: <FileText className="w-4 h-4" />,
        label: 'Prescriptions',
        description: 'Review issued prescriptions',
      },
    ];
  }

  if (role === 'receptionist') {
    const actions: QuickActionItem[] = [
      {
        key: 'walkin',
        href: '/dashboard/walk-ins',
        icon: <ClipboardList className="w-4 h-4" />,
        label: 'Check-in Walk-in',
        description: 'Register a new patient visit',
      },
      {
        key: 'new-appt',
        href: '/dashboard/appointments?new=1',
        icon: <Calendar className="w-4 h-4" />,
        label: 'New appointment',
        description: 'Book linked customer & pet',
      },
      {
        key: 'appt',
        href: '/dashboard/appointments',
        icon: <ClipboardList className="w-4 h-4" />,
        label: 'View Appointments',
        description: "Manage today's bookings",
      },
      {
        key: 'customer',
        href: '/dashboard/customers',
        icon: <Plus className="w-4 h-4" />,
        label: 'Add Customer',
        description: 'Register a new client & pet',
      },
    ];
    if (readyForCheckout > 0) {
      actions.push({
        key: 'checkout',
        href: '/dashboard/walk-ins',
        icon: <Receipt className="w-4 h-4" />,
        label: `Checkout queue (${readyForCheckout})`,
        description: 'Patients ready for billing',
      });
    }
    return actions;
  }

  return [
    {
      key: 'staff',
      href: '/dashboard/staff',
      icon: <Users className="w-4 h-4" />,
      label: 'Manage Staff',
      description: 'Invite and assign team members',
    },
    {
      key: 'reports',
      href: '/dashboard/reports',
      icon: <TrendingUp className="w-4 h-4" />,
      label: 'View Reports',
      description: 'Sales and performance analytics',
    },
    {
      key: 'walkin',
      href: '/dashboard/walk-ins',
      icon: <ClipboardList className="w-4 h-4" />,
      label: 'Walk-in Queue',
      description: 'Monitor front desk operations',
    },
    {
      key: 'settings',
      href: '/dashboard/settings',
      icon: <Stethoscope className="w-4 h-4" />,
      label: 'Clinic Settings',
      description: 'Branding and preferences',
    },
  ];
}

function SecondaryStat({
  icon: Icon,
  label,
  value,
}: {
  icon: typeof Users;
  label: string;
  value: number;
}) {
  return (
    <div className="glass-panel rounded-2xl p-5 flex items-center gap-4">
      <div className="w-10 h-10 rounded-xl bg-primary/10 flex items-center justify-center">
        <Icon className="w-5 h-5 text-primary" />
      </div>
      <div>
        <span className="text-[10px] font-bold text-on-surface-variant uppercase block">
          {label}
        </span>
        <span className="text-xl font-bold text-on-surface">{value}</span>
      </div>
    </div>
  );
}

function QuickAction({ href, icon, label, description }: QuickActionItem) {
  return (
    <Link
      href={href}
      className="flex items-center gap-4 glass-panel rounded-2xl p-4 hover:border-primary/30 transition-all group"
    >
      <div className="w-9 h-9 bg-primary/10 rounded-xl flex items-center justify-center text-primary group-hover:bg-primary group-hover:text-on-primary transition-all">
        {icon}
      </div>
      <div>
        <span className="text-xs font-bold text-on-surface block">{label}</span>
        <span className="text-[10px] text-on-surface-variant">{description}</span>
      </div>
    </Link>
  );
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
      return 'bg-on-surface-variant/30';
    case 'cancelled':
      return 'bg-destructive';
    default:
      return 'bg-on-surface-variant/20';
  }
}

function getStatusBadge(status: string) {
  switch (status) {
    case 'waiting':
      return 'bg-amber-500/15 text-amber-400';
    case 'consulting':
      return 'bg-blue-500/15 text-blue-400';
    case 'ready_for_checkout':
      return 'bg-emerald-500/15 text-emerald-400';
    case 'completed':
      return 'bg-on-surface-variant/10 text-on-surface-variant';
    case 'cancelled':
      return 'bg-destructive/15 text-destructive';
    default:
      return 'bg-on-surface-variant/10 text-on-surface-variant';
  }
}

function formatTime(isoString: string | null) {
  if (!isoString) return '';
  return new Date(isoString).toLocaleTimeString('en-US', {
    hour: 'numeric',
    minute: '2-digit',
    hour12: true,
  });
}
