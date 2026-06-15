import { resolveServerAuthContext } from '@/lib/auth/context';
import { canAccessRoute, canShowWidget, hasCapability, getCapabilitiesForRole } from '@/lib/auth/capabilities';
import { canAccessRouteByFeature } from '@/lib/auth/features';
import { createClient, createAdminClient } from '@/lib/supabase/server';
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
import AttendanceWidgetClient, {
  type MyAttendance,
} from '@/components/dashboard/AttendanceWidgetClient';
import EmptyState from '@/components/ui/premium/EmptyState';
import ReceptionistHomeClient, {
  type ReceptionistAppointmentRow,
  type ReceptionistVisitRow,
  type VisitRecordRow,
} from '@/components/dashboard/ReceptionistHomeClient';
import LiveOperationsPanel, {
  type LiveConsultRow,
} from '@/components/dashboard/LiveOperationsPanel';
import MedicalRecordActivityPanel, {
  type MedicalActivityRow,
} from '@/components/dashboard/MedicalRecordActivityPanel';
import { isConsultTrackingEnabled } from '@/lib/auth/features';
import { redirect } from 'next/navigation';
import Link from 'next/link';
import {
  Calendar,
  ClipboardList,
  Receipt,
  BadgeCheck,
  Banknote,
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
  Search,
  Layers,
  Bot,
  Share2,
} from 'lucide-react';
import type { UserSessionDetails } from '@/lib/services/auth';
import { getTimeGreeting } from '@/lib/utils/greeting';
import DashboardQabShell from '@/components/dashboard/DashboardQabShell';
import StaffDashboardGate from '@/components/dashboard/StaffDashboardGate';
import StaffAttendanceOverviewPanel, {
  type StaffAttendanceOverviewRow,
} from '@/components/dashboard/StaffAttendanceOverviewPanel';
import DoctorQueuePanel, {
  type DoctorQueueVisit,
} from '@/components/dashboard/DoctorQueuePanel';

export const metadata = {
  title: 'Dashboard — Overview',
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
  if (ctx.isSuperAdmin && !ctx.isImpersonating) redirect('/super-admin/dashboard');

  const session = ctx;
  const activeBranchId = ctx.activeBranchId;
  const role = session.role;
  const greeting = getTimeGreeting();

  if (!activeBranchId) {
    return (
      <div className="space-y-8">
        <RoleDashboardHero
          firstName={session.firstName || 'User'}
          greeting={greeting}
          organizationName={session.organizationName}
          role={role}
          quickLinks={[]}
        />
        <div className="bg-amber-500/10 border border-amber-500/30 text-amber-400 text-sm p-6 rounded-2xl">
          {ctx.isImpersonating ? (
            <>
              This clinic has no active branches yet. Finish provisioning from{' '}
              <Link href="/super-admin/organizations" className="text-primary font-semibold hover:underline">
                Clinics
              </Link>{' '}
              (add a branch) before dashboard metrics can load.
            </>
          ) : (
            <>
              You must be assigned to a clinic branch to view dashboard metrics. Please contact your
              clinic administrator to get branch access.
            </>
          )}
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
  let receptionistUpcoming: ReceptionistAppointmentRow[] = [];
  let receptionistWaiting: ReceptionistVisitRow[] = [];
  let receptionistConsulting: ReceptionistVisitRow[] = [];
  let receptionistCheckout: ReceptionistVisitRow[] = [];
  let receptionistVisitRecords: VisitRecordRow[] = [];
  let myAttendance: MyAttendance = {
    checkedIn: false,
    checkedOut: false,
    status: null,
    checkInAt: null,
    checkOutAt: null,
  };
  let liveActiveConsults: LiveConsultRow[] = [];
  let liveCheckoutQueue: LiveConsultRow[] = [];
  let medicalActivities: MedicalActivityRow[] = [];
  let showConsultTimer = false;
  let featuresJson: Record<string, unknown> | null = null;
  let doctors: { id: string; firstName: string; lastName: string }[] = [];
  let staffAttendanceRows: StaffAttendanceOverviewRow[] = [];
  let doctorQueueWaiting: DoctorQueueVisit[] = [];
  let doctorQueueConsulting: DoctorQueueVisit[] = [];
  const showAttendance = hasCapability(role, 'mark_attendance');

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
    readyForCheckout = 1;
    if (role === 'receptionist') {
      receptionistUpcoming = [
        {
          id: 'ap1',
          petName: 'Max',
          customerName: 'John Doe',
          customerPhone: '555-9090',
          preferredTime: '10:00',
          isEmergency: false,
        },
        {
          id: 'ap2',
          petName: 'Bella',
          customerName: 'Jane Smith',
          customerPhone: '555-8080',
          preferredTime: '14:30',
          isEmergency: true,
        },
      ];
      receptionistWaiting = [
        { id: 'v1', petName: 'Bella', customerName: 'Jane Smith', reason: 'Ear check', status: 'waiting' },
      ];
      receptionistCheckout = [
        { id: 'v3', petName: 'Rocky', customerName: 'Bob Johnson', reason: 'Vaccination', status: 'ready_for_checkout' },
      ];
    }
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
          .from('patients')
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
          .select(`
            id, reason, status, checked_in_at, consult_started_at, is_emergency, triage_notes,
            pets:patients ( id, name, species, breed ),
            customers ( first_name, last_name ),
            visit_assignments!inner ( doctor_id )
          `)
          .eq('visit_assignments.doctor_id', session.userId)
          .in('status', ['waiting', 'consulting'])
          .order('is_emergency', { ascending: false })
          .order('checked_in_at', { ascending: true })
          .then((r) => {
            const mapped =
              r.data?.map((v) => ({
                id: v.id,
                reason: v.reason,
                status: v.status,
                checkedInAt: v.checked_in_at as string,
                consultStartedAt: v.consult_started_at as string | null,
                isEmergency: v.is_emergency ?? false,
                triageNotes: v.triage_notes as string | null,
                pet: {
                  id: (v.pets as { id: string; name: string; species: string; breed: string | null }).id,
                  name: (v.pets as { name: string }).name,
                  species: (v.pets as { species: string }).species,
                  breed: (v.pets as { breed: string | null }).breed,
                },
                customer: {
                  firstName: (v.customers as { first_name: string }).first_name,
                  lastName: (v.customers as { last_name: string }).last_name,
                },
              })) || [];
            doctorQueueWaiting = mapped.filter((x) => x.status === 'waiting');
            doctorQueueConsulting = mapped.filter((x) => x.status === 'consulting');
            myQueueCount = mapped.length;
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
        pets:patients ( name, species ),
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

    if (role === 'receptionist') {
      const mapVisit = (v: {
        id: string;
        reason: string;
        status: string;
        pets: { name: string } | { name: string }[] | null;
        customers: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
      }): ReceptionistVisitRow => {
        const pet = Array.isArray(v.pets) ? v.pets[0] : v.pets;
        const cust = Array.isArray(v.customers) ? v.customers[0] : v.customers;
        return {
          id: v.id,
          petName: pet?.name || 'Unknown',
          customerName: cust ? `${cust.first_name} ${cust.last_name}` : 'Unknown',
          reason: v.reason,
          status: v.status,
        };
      };

      queries.push(
        supabase
          .from('appointments')
          .select('id, patient_name, customer_name, customer_phone, preferred_time, is_emergency')
          .eq('branch_id', activeBranchId)
          .eq('preferred_date', today)
          .in('status', ['confirmed', 'rescheduled', 'requested'])
          .order('preferred_time', { ascending: true })
          .limit(5)
          .then((r) => {
            receptionistUpcoming =
              r.data?.map((a) => ({
                id: a.id,
                petName: a.patient_name,
                customerName: a.customer_name,
                customerPhone: a.customer_phone || '',
                preferredTime: a.preferred_time?.slice(0, 5) || '',
                isEmergency: a.is_emergency ?? false,
              })) || [];
          })
      );
      queries.push(
        supabase
          .from('visits')
          .select('id, reason, status, pets:patients(name), customers(first_name, last_name)')
          .eq('branch_id', activeBranchId)
          .eq('status', 'waiting')
          .order('checked_in_at', { ascending: true })
          .limit(5)
          .then((r) => {
            receptionistWaiting = (r.data || []).map(mapVisit);
          })
      );
      queries.push(
        supabase
          .from('visits')
          .select(`
            id, reason, status,
            pets:patients(name),
            customers(first_name, last_name),
            visit_assignments(user_profiles(first_name, last_name))
          `)
          .eq('branch_id', activeBranchId)
          .eq('status', 'consulting')
          .order('consult_started_at', { ascending: false })
          .limit(5)
          .then((r) => {
            receptionistConsulting = (r.data || []).map((v) => {
              const base = mapVisit(v);
              const doc = (v.visit_assignments as Array<{ user_profiles: { first_name: string; last_name: string } | null }> | null)?.[0]?.user_profiles;
              return {
                ...base,
                doctorName: doc ? `Dr. ${doc.first_name} ${doc.last_name}` : undefined,
              };
            });
          })
      );
      queries.push(
        supabase
          .from('visits')
          .select('id, reason, status, pets:patients(name), customers(first_name, last_name)')
          .eq('branch_id', activeBranchId)
          .eq('status', 'ready_for_checkout')
          .order('checked_in_at', { ascending: true })
          .limit(5)
          .then((r) => {
            receptionistCheckout = (r.data || []).map(mapVisit);
          })
      );
      queries.push(
        supabase
          .from('invoices')
          .select(
            'id, invoice_number, visit_id, total, payment_status, created_at, customers(first_name, last_name), pets:patients(name)'
          )
          .eq('branch_id', activeBranchId)
          .order('created_at', { ascending: false })
          .limit(50)
          .then((r) => {
            receptionistVisitRecords =
              r.data?.map((inv) => {
                const cust = Array.isArray(inv.customers) ? inv.customers[0] : inv.customers;
                const pet = Array.isArray(inv.pets) ? inv.pets[0] : inv.pets;
                return {
                  id: inv.id,
                  invoiceNumber: inv.invoice_number,
                  visitId: inv.visit_id,
                  customerName: cust
                    ? `${(cust as { first_name: string }).first_name} ${(cust as { last_name: string }).last_name}`
                    : 'Unknown',
                  petName: (pet as { name?: string } | null)?.name || '—',
                  total: Number(inv.total) || 0,
                  paymentStatus: inv.payment_status,
                  createdAt: inv.created_at,
                };
              }) || [];
          })
      );
    }

    if (role === 'clinic_admin' || role === 'receptionist') {
      const { data: subRow } = await supabase
        .from('subscription_status')
        .select('features')
        .eq('organization_id', session.organizationId || '')
        .maybeSingle();
      featuresJson = (subRow?.features as Record<string, unknown>) || null;
      showConsultTimer = isConsultTrackingEnabled(featuresJson);
    }

    if (role === 'clinic_admin' || role === 'receptionist' || role === 'doctor') {
      const { data: doctorsData } = await supabase
        .from('organization_members')
        .select('user_id, user_profiles ( first_name, last_name )')
        .eq('organization_id', session.organizationId || '')
        .eq('role', 'doctor')
        .eq('is_active', true);
      doctors =
        doctorsData?.map((d) => ({
          id: d.user_id,
          firstName: (d.user_profiles as { first_name?: string } | null)?.first_name || '',
          lastName: (d.user_profiles as { first_name?: string; last_name?: string } | null)?.last_name || '',
        })) || [];
    }

    if (role === 'clinic_admin' || role === 'receptionist') {
      const mapLiveVisit = (v: {
        id: string;
        status: string;
        reason: string;
        consult_started_at: string | null;
        checked_in_at: string;
        is_emergency: boolean;
        pets: { name: string; species: string } | { name: string; species: string }[] | null;
        customers: { first_name: string; last_name: string } | { first_name: string; last_name: string }[] | null;
        visit_assignments: Array<{ user_profiles: { first_name: string; last_name: string } | null }> | null;
      }): LiveConsultRow => {
        const pet = Array.isArray(v.pets) ? v.pets[0] : v.pets;
        const cust = Array.isArray(v.customers) ? v.customers[0] : v.customers;
        const doc = v.visit_assignments?.[0]?.user_profiles;
        return {
          id: v.id,
          status: v.status,
          reason: v.reason,
          consultStartedAt: v.consult_started_at,
          checkedInAt: v.checked_in_at,
          petName: pet?.name || 'Unknown',
          petSpecies: pet?.species || 'N/A',
          customerName: cust ? `${cust.first_name} ${cust.last_name}` : 'Unknown',
          doctorName: doc ? `Dr. ${doc.first_name} ${doc.last_name}` : 'Unassigned',
          isEmergency: v.is_emergency ?? false,
        };
      };

      queries.push(
        supabase
          .from('visits')
          .select(`
            id, reason, status, consult_started_at, checked_in_at, is_emergency,
            pets:patients ( name, species ),
            customers ( first_name, last_name ),
            visit_assignments ( user_profiles ( first_name, last_name ) )
          `)
          .eq('branch_id', activeBranchId)
          .in('status', ['waiting', 'consulting'])
          .order('checked_in_at', { ascending: true })
          .then((r) => {
            liveActiveConsults = (r.data || []).map(mapLiveVisit);
          })
      );

      queries.push(
        supabase
          .from('visits')
          .select(`
            id, reason, status, consult_started_at, checked_in_at, is_emergency,
            pets:patients ( name, species ),
            customers ( first_name, last_name ),
            visit_assignments ( user_profiles ( first_name, last_name ) )
          `)
          .eq('branch_id', activeBranchId)
          .eq('status', 'ready_for_checkout')
          .order('completed_at', { ascending: true })
          .then((r) => {
            liveCheckoutQueue = (r.data || []).map(mapLiveVisit);
          })
      );

      queries.push(
        supabase
          .from('audit_logs')
          .select('id, action, resource_type, created_at, actor_user_id, actor_role, after_data')
          .eq('organization_id', session.organizationId || '')
          .eq('branch_id', activeBranchId)
          .in('action', [
            'CLINICAL_NOTE_CREATED',
            'CLINICAL_NOTE_UPDATED',
            'PRESCRIPTION_CREATED',
            'DOCUMENT_UPLOADED',
            'DOCUMENT_DELETED',
            'LAB_ORDER_CREATED',
            'LAB_ORDER_UPDATED',
          ])
          .order('created_at', { ascending: false })
          .limit(12)
          .then(async (r) => {
            const logs = r.data || [];
            const actorIds = [...new Set(logs.map((l) => l.actor_user_id).filter(Boolean))] as string[];
            const actorMap = new Map<string, string>();
            if (actorIds.length > 0) {
              const { data: actors } = await supabase
                .from('user_profiles')
                .select('id, first_name, last_name')
                .in('id', actorIds);
              for (const a of actors || []) {
                actorMap.set(a.id, `${a.first_name} ${a.last_name}`.trim());
              }
            }
            medicalActivities = logs.map((log) => {
              const after = log.after_data as Record<string, unknown> | null;
              let summary = log.resource_type;
              if (after?.diagnosis) summary = String(after.diagnosis);
              else if (after?.status) summary = `${log.resource_type}: ${after.status}`;
              return {
                id: log.id,
                action: log.action,
                actorName: actorMap.get(log.actor_user_id) || 'Staff',
                actorRole: log.actor_role || 'staff',
                resourceType: log.resource_type,
                createdAt: log.created_at,
                summary,
              };
            });
          })
      );
    }

    if (role === 'clinic_admin' && session.organizationId) {
      const todayDate = new Date().toISOString().slice(0, 10);
      queries.push(
        (async () => {
          const admin = await createAdminClient();
          const { data: members } = await admin
            .from('organization_members')
            .select('user_id, role, is_active')
            .eq('organization_id', session.organizationId!)
            .eq('is_active', true)
            .neq('role', 'clinic_admin');

          const userIds = (members || []).map((m) => m.user_id);
          if (userIds.length === 0) return;

          const [{ data: profiles }, { data: attendanceData }] = await Promise.all([
            admin
              .from('user_profiles')
              .select('id, first_name, last_name')
              .in('id', userIds),
            admin
              .from('attendance_records')
              .select('user_id, status, check_in_at, check_out_at')
              .eq('organization_id', session.organizationId!)
              .eq('work_date', todayDate),
          ]);

          const nameById = new Map(
            (profiles || []).map((p) => [p.id, `${p.first_name || ''} ${p.last_name || ''}`.trim()])
          );
          const attendanceByUser = new Map<
            string,
            {
              user_id: string;
              status: string;
              check_in_at: string | null;
              check_out_at: string | null;
            }
          >((attendanceData || []).map((a) => [a.user_id, a]));

          staffAttendanceRows = (members || []).map((m) => {
            const rec = attendanceByUser.get(m.user_id);
            let rosterStatus: StaffAttendanceOverviewRow['rosterStatus'] = 'not_scheduled';
            if (rec?.check_in_at && !rec.check_out_at) {
              rosterStatus = rec.status === 'late' ? 'late' : 'on_shift';
            } else if (rec?.check_in_at && rec.check_out_at) {
              rosterStatus = rec.status === 'late' ? 'late' : 'present';
            } else if (rec?.status === 'absent') {
              rosterStatus = 'absent';
            }
            return {
              userId: m.user_id,
              staffName: nameById.get(m.user_id) || 'Unknown',
              role: m.role,
              checkInAt: rec?.check_in_at ?? null,
              checkOutAt: rec?.check_out_at ?? null,
              rosterStatus,
            };
          });
        })()
      );
    }

    if (showAttendance && session.organizationId) {
      const todayDate = new Date().toISOString().slice(0, 10);
      queries.push(
        supabase
          .from('attendance_records')
          .select('status, check_in_at, check_out_at')
          .eq('organization_id', session.organizationId)
          .eq('user_id', session.userId)
          .eq('work_date', todayDate)
          .maybeSingle()
          .then((r) => {
            const rec = r.data as
              | { status: string | null; check_in_at: string | null; check_out_at: string | null }
              | null;
            if (rec) {
              myAttendance = {
                checkedIn: Boolean(rec.check_in_at),
                checkedOut: Boolean(rec.check_out_at),
                status: rec.status,
                checkInAt: rec.check_in_at,
                checkOutAt: rec.check_out_at,
              };
            }
          })
      );
    }

    await Promise.all(queries);
  }

  const features = session.features;
  const canLink = (href: string) =>
    canAccessRoute(role, href) && canAccessRouteByFeature(features, href);

  const quickLinks = buildQuickLinks(role, readyForCheckout, canLink);
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
  }, canLink);
  const quickActions =
    role === 'clinic_admin' || role === 'receptionist' || role === 'doctor'
      ? []
      : buildQuickActions(role, readyForCheckout, canLink);
  const showLowStock = canShowWidget(role, 'lowStock') && lowStockItems.length > 0;
  const showSecondary =
    canShowWidget(role, 'totalCustomers') ||
    canShowWidget(role, 'totalPets') ||
    role === 'clinic_admin';

  const staffGateLocked =
    role !== 'clinic_admin' && showAttendance && !myAttendance.checkedIn;

  return (
    <div className="space-y-8">
      <RoleDashboardHero
        firstName={session.firstName || 'User'}
        greeting={greeting}
        organizationName={session.organizationName}
        role={role}
        quickLinks={staffGateLocked ? [] : quickLinks}
      />

      {showAttendance && <AttendanceWidgetClient initial={myAttendance} />}

      <StaffDashboardGate locked={staffGateLocked}>
      <DashboardQabShell
        role={role}
        capabilities={getCapabilitiesForRole(role)}
        features={session.features}
        featuresJson={featuresJson}
        doctors={doctors}
        activeBranchId={activeBranchId}
        organizationId={session.organizationId || ''}
        clinicName={session.organizationName || 'Clinic'}
        liveActiveConsults={liveActiveConsults}
        liveCheckoutQueue={liveCheckoutQueue}
        showConsultTimer={showConsultTimer}
      />

      {role === 'doctor' && !staffGateLocked && (
        <DoctorQueuePanel
          waitingVisits={doctorQueueWaiting}
          consultingVisits={doctorQueueConsulting}
          showConsultTimer={showConsultTimer}
          compact
        />
      )}

      {kpis.length > 0 && <DashboardWidgetGrid kpis={kpis} />}

      {role === 'clinic_admin' && (
        <div className="grid lg:grid-cols-2 gap-6">
          <LiveOperationsPanel
            activeConsults={liveActiveConsults}
            readyForCheckout={liveCheckoutQueue}
            showConsultTimer={showConsultTimer}
          />
          <MedicalRecordActivityPanel activities={medicalActivities} />
        </div>
      )}

      {role === 'clinic_admin' && (
        <StaffAttendanceOverviewPanel
          rows={staffAttendanceRows}
          attendanceDate={new Date().toISOString().slice(0, 10)}
        />
      )}

      {role === 'receptionist' && (
        <ReceptionistHomeClient
          todayAppointments={todayAppointments}
          waitingWalkIns={waitingWalkIns}
          readyForCheckout={readyForCheckout}
          unpaidInvoices={unpaidInvoices}
          upcomingAppointments={receptionistUpcoming}
          waitingVisits={receptionistWaiting}
          consultingVisits={receptionistConsulting}
          checkoutVisits={receptionistCheckout}
          visitRecords={receptionistVisitRecords}
        />
      )}

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
      </StaffDashboardGate>
    </div>
  );
}

function buildQuickLinks(
  role: UserSessionDetails['role'],
  readyForCheckout: number,
  canLink: (href: string) => boolean
): QuickLink[] {
  let links: QuickLink[] = [];
  if (role === 'doctor') {
    links = [
      { key: 'queue', href: '/dashboard/doctors', label: 'Consultations' },
      { key: 'rx', href: '/dashboard/prescriptions', label: 'Prescriptions' },
      { key: 'appt', href: '/dashboard/appointments', label: 'Appointments' },
    ];
  } else if (role === 'receptionist') {
    links = [
      { key: 'walkin', href: '/dashboard/walk-ins?new=1', label: 'Quick walk-in' },
      { key: 'appt', href: '/dashboard/appointments', label: 'Appointments' },
      {
        key: 'checkout',
        href: '/dashboard/walk-ins',
        label: `Checkout queue (${readyForCheckout})`,
      },
      { key: 'billing', href: '/dashboard/invoices', label: 'Billing' },
    ];
  } else {
    links = [
      { key: 'staff', href: '/dashboard/staff', label: 'Manage staff' },
      { key: 'reports', href: '/dashboard/reports', label: 'Reports' },
      { key: 'upgrade', href: '/dashboard/upgrade', label: 'Upgrade plan' },
    ];
  }
  return links.filter((l) => canLink(l.href));
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
  },
  canLink: (href: string) => boolean
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
    return kpis.filter((k) => !k.href || canLink(k.href));
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
      icon: BadgeCheck,
      href: '/dashboard/walk-ins',
    });
  }
  if (canShowWidget(role, 'unpaidInvoices')) {
    kpis.push({
      key: 'unpaid',
      label: 'Unpaid Invoices',
      value: data.unpaidInvoices,
      icon: Banknote,
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

  return kpis.filter((k) => !k.href || canLink(k.href)).slice(0, 4);
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
  readyForCheckout: number,
  canLink: (href: string) => boolean
): QuickActionItem[] {
  if (role === 'doctor') {
    return [
      {
        key: 'queue',
        href: '/dashboard/doctors',
        icon: <BriefcaseMedical className="w-4 h-4" />,
        label: 'Consultations',
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
    ].filter((a) => canLink(a.href));
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
        href: '/dashboard/customers?focus=phone',
        icon: <Search className="w-4 h-4" />,
        label: 'Search patient',
        description: 'Find owner by phone number',
      },
      {
        key: 'inventory',
        href: '/dashboard/inventory?tab=intake',
        icon: <Layers className="w-4 h-4" />,
        label: 'Stock intake',
        description: 'Manual or scan supplier invoice',
      },
      {
        key: 'unpaid',
        href: '/dashboard/invoices?status=unpaid',
        icon: <Receipt className="w-4 h-4" />,
        label: 'Unpaid invoices',
        description: 'Follow up on outstanding bills',
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
    return actions.filter((a) => canLink(a.href));
  }

  const adminActions: QuickActionItem[] = [
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
    {
      key: 'ai',
      href: '/dashboard/ai-assistant',
      icon: <Bot className="w-4 h-4" />,
      label: 'AI Assistant',
      description: 'Workflow help and draft communications',
    },
    {
      key: 'social',
      href: '/dashboard/social',
      icon: <Share2 className="w-4 h-4" />,
      label: 'Social posts',
      description: 'AI-generated clinic social content',
    },
  ];
  return adminActions.filter((a) => canLink(a.href));
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
