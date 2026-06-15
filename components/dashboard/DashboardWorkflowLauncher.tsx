'use client';

import { useState, useEffect, useCallback } from 'react';
import { useRouter } from 'next/navigation';
import Link from 'next/link';
import Modal from '@/components/ui/premium/Modal';
import SlideOverPanel from '@/components/ui/premium/SlideOverPanel';
import NewAppointmentWizard from '@/components/reception/NewAppointmentWizard';
import LiveOperationsPanel, { type LiveConsultRow } from '@/components/dashboard/LiveOperationsPanel';
import AiAssistantClient from '@/components/ai/AiAssistantClient';
import SocialAutomationClient from '@/components/social/SocialAutomationClient';
import { globalClinicSearchAction } from '@/lib/services/search-actions';
import {
  getDoctorTreatmentRecordsTodayAction,
  getFollowUpAppointmentsTodayAction,
  getBranchSummaryAction,
  getLowStockForBranchAction,
  getInventoryForecastAction,
} from '@/lib/services/dashboard-qab-actions';
import { generateAiAnalyticsReportAction } from '@/lib/services/ai-analytics-actions';
import { listCameraDevicesAction } from '@/lib/services/camera-actions';
import { confirmAppointmentAction } from '@/lib/services/appointment-actions';
import type { ForecastItem } from '@/lib/inventory/forecast';
import type { QabModalId } from '@/components/dashboard/role-qab-config';
import { Loader2, Search, ExternalLink, Users, Shield } from 'lucide-react';

interface Doctor {
  id: string;
  firstName: string;
  lastName: string;
}

interface DashboardWorkflowLauncherProps {
  activeModal: QabModalId | null;
  onClose: () => void;
  doctors: Doctor[];
  activeBranchId: string;
  liveActiveConsults: LiveConsultRow[];
  liveCheckoutQueue: LiveConsultRow[];
  showConsultTimer: boolean;
  organizationId: string;
  clinicName: string;
}

export default function DashboardWorkflowLauncher({
  activeModal,
  onClose,
  doctors,
  activeBranchId,
  liveActiveConsults,
  liveCheckoutQueue,
  showConsultTimer,
  organizationId,
  clinicName,
}: DashboardWorkflowLauncherProps) {
  const router = useRouter();

  return (
    <>
      <NewAppointmentWizard
        doctors={doctors}
        activeBranchId={activeBranchId}
        isOpen={activeModal === 'appointment'}
        onClose={onClose}
      />

      <PatientProfileSearchModal open={activeModal === 'patient_profile'} onClose={onClose} />

      <RolePermissionsModal open={activeModal === 'role_creation'} onClose={onClose} />

      <StaffQuickModal open={activeModal === 'staff_management'} onClose={onClose} />

      <Modal open={activeModal === 'consultation_status'} onClose={onClose} title="Consultation Status" size="lg">
        <LiveOperationsPanel
          activeConsults={liveActiveConsults}
          readyForCheckout={liveCheckoutQueue}
          showConsultTimer={showConsultTimer}
        />
        <p className="text-[10px] text-on-surface-variant mt-4 italic">
          Read-only view for front desk. Medical notes are not shown here.
        </p>
      </Modal>

      <TreatmentRecordModal open={activeModal === 'treatment_record'} onClose={onClose} />

      <FollowUpCheckInModal
        open={activeModal === 'next_appointment_checkin'}
        onClose={onClose}
        onRefresh={() => router.refresh()}
      />

      <InventoryControlModal
        open={activeModal === 'inventory_control'}
        onClose={onClose}
        activeBranchId={activeBranchId}
        organizationId={organizationId}
      />

      <InvoicesQuickModal open={activeModal === 'invoices'} onClose={onClose} />

      <MultiBranchModal open={activeModal === 'multi_branch'} onClose={onClose} />

      <LiveCameraModal open={activeModal === 'live_camera'} onClose={onClose} />

      <SlideOverPanel
        open={activeModal === 'ai_assistant'}
        onClose={onClose}
        title="AI Assistant"
        description="Clinic workflow help and guidance"
      >
        <AiAssistantClient />
      </SlideOverPanel>

      <SlideOverPanel
        open={activeModal === 'social_media'}
        onClose={onClose}
        title="Social Media"
        description="Upload, generate captions, and publish"
        width="xl"
      >
        <SocialAutomationClient activeBranchId={activeBranchId} clinicName={clinicName} />
      </SlideOverPanel>

      <AiAnalyticsSlideOver open={activeModal === 'ai_analytic_reports'} onClose={onClose} />
    </>
  );
}

function PatientProfileSearchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [query, setQuery] = useState('');
  const [results, setResults] = useState<
    Array<{ title: string; subtitle: string; href: string }>
  >([]);
  const [loading, setLoading] = useState(false);

  const search = useCallback(async (q: string) => {
    if (q.length < 2) {
      setResults([]);
      return;
    }
    setLoading(true);
    const res = await globalClinicSearchAction({ query: q });
    if (res.success && res.results) {
      setResults(
        res.results
          .filter((r) => r.type === 'pet' || r.type === 'customer')
          .map((r) => ({ title: r.title, subtitle: r.subtitle, href: r.href }))
      );
    }
    setLoading(false);
  }, []);

  useEffect(() => {
    const t = setTimeout(() => search(query), 300);
    return () => clearTimeout(t);
  }, [query, search]);

  return (
    <Modal open={open} onClose={onClose} title="Patient Profile" description="Search owner or pet" size="lg">
      <div className="relative mb-4">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-on-surface-variant/40" />
        <input
          value={query}
          onChange={(e) => setQuery(e.target.value)}
          placeholder="Pet name, owner name, phone..."
          className="w-full pl-9 pr-3 py-2 border border-outline-variant rounded-xl text-xs"
        />
      </div>
      {loading && <Loader2 className="w-4 h-4 animate-spin mx-auto" />}
      <div className="space-y-2 max-h-64 overflow-y-auto">
        {results.map((r) => (
          <Link
            key={r.href}
            href={r.href}
            onClick={onClose}
            className="block p-3 rounded-xl border border-outline-variant/40 hover:bg-surface-container/40"
          >
            <span className="text-xs font-bold text-on-surface">{r.title}</span>
            <span className="text-[10px] text-on-surface-variant block">{r.subtitle}</span>
          </Link>
        ))}
      </div>
    </Modal>
  );
}

function RolePermissionsModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const roles = [
    { name: 'Clinic Admin', access: 'Full clinic setup, staff, inventory, reports, branches, social' },
    { name: 'Receptionist', access: 'Appointments, walk-ins, billing, customers, inventory (limited)' },
    { name: 'Doctor', access: 'Consultations, prescriptions, patient history, appointments' },
  ];
  return (
    <Modal open={open} onClose={onClose} title="Role Creation" description="Fixed roles with permission sets" size="lg">
      <p className="text-xs text-on-surface-variant mb-4">
        ClinixDev uses predefined roles for security. Assign roles when inviting staff.
      </p>
      <div className="space-y-3">
        {roles.map((r) => (
          <div key={r.name} className="p-3 rounded-xl border border-outline-variant/40 flex gap-3">
            <Shield className="w-5 h-5 text-primary shrink-0" />
            <div>
              <span className="text-xs font-bold text-on-surface">{r.name}</span>
              <p className="text-[10px] text-on-surface-variant">{r.access}</p>
            </div>
          </div>
        ))}
      </div>
      <Link
        href="/dashboard/staff"
        onClick={onClose}
        className="mt-4 inline-flex items-center gap-1 text-xs font-bold text-primary hover:underline"
      >
        <Users className="w-3.5 h-3.5" />
        Manage staff & assign roles
      </Link>
    </Modal>
  );
}

function StaffQuickModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Staff Management" size="md">
      <p className="text-xs text-on-surface-variant mb-4">
        Invite team members, assign roles, manage schedules and attendance.
      </p>
      <Link
        href="/dashboard/staff"
        onClick={onClose}
        className="inline-flex items-center gap-2 bg-primary text-white px-4 py-2 rounded-xl text-xs font-bold"
      >
        Open staff management
        <ExternalLink className="w-3.5 h-3.5" />
      </Link>
    </Modal>
  );
}

function TreatmentRecordModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [records, setRecords] = useState<
    Array<{
      visitId: string;
      petName: string;
      diagnosis: string;
      treatmentPlan: string;
      visitType: string;
    }>
  >([]);
  const [loading, setLoading] = useState(false);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    getDoctorTreatmentRecordsTodayAction().then((res) => {
      if (res.success) setRecords(res.records);
      setLoading(false);
    });
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Treatment Record" description="Today's completed consultations" size="lg">
      {loading ? (
        <Loader2 className="w-5 h-5 animate-spin mx-auto" />
      ) : records.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic text-center py-6">No completed treatments today.</p>
      ) : (
        <div className="space-y-3 max-h-80 overflow-y-auto">
          {records.map((r) => (
            <div key={r.visitId} className="p-3 rounded-xl border border-outline-variant/40">
              <div className="flex justify-between">
                <span className="text-xs font-bold">{r.petName}</span>
                <span className="text-[10px] text-primary capitalize">{r.visitType}</span>
              </div>
              <p className="text-[10px] text-on-surface-variant mt-1">{r.diagnosis}</p>
              {r.treatmentPlan && (
                <p className="text-[10px] text-on-surface-variant/80 mt-1 line-clamp-2">{r.treatmentPlan}</p>
              )}
              <a
                href={`/api/visits/${r.visitId}/treatment-pdf`}
                target="_blank"
                rel="noopener noreferrer"
                className="text-[10px] text-primary font-bold mt-2 inline-block hover:underline"
              >
                Download treatment PDF
              </a>
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function FollowUpCheckInModal({
  open,
  onClose,
  onRefresh,
}: {
  open: boolean;
  onClose: () => void;
  onRefresh: () => void;
}) {
  const [appts, setAppts] = useState<
    Array<{ id: string; patient_name: string; customer_name: string; status: string; reason: string }>
  >([]);

  useEffect(() => {
    if (!open) return;
    getFollowUpAppointmentsTodayAction().then((res) => {
      if (res.success) setAppts(res.appointments);
    });
  }, [open]);

  const approve = async (id: string) => {
    await confirmAppointmentAction(id);
    onRefresh();
    getFollowUpAppointmentsTodayAction().then((res) => {
      if (res.success) setAppts(res.appointments);
    });
  };

  return (
    <Modal open={open} onClose={onClose} title="Next Appointment Check-in" description="Follow-up requests" size="lg">
      {appts.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic text-center py-6">No pending follow-up appointments.</p>
      ) : (
        <div className="space-y-2">
          {appts.map((a) => (
            <div key={a.id} className="flex items-center justify-between p-3 rounded-xl border border-outline-variant/40">
              <div>
                <span className="text-xs font-bold">{a.patient_name}</span>
                <p className="text-[10px] text-on-surface-variant">{a.customer_name} · {a.reason}</p>
              </div>
              {a.status === 'requested' ? (
                <button
                  type="button"
                  onClick={() => approve(a.id)}
                  className="text-[10px] font-bold bg-primary text-white px-3 py-1.5 rounded-lg"
                >
                  Approve
                </button>
              ) : (
                <span className="text-[10px] text-emerald-600 font-bold capitalize">{a.status}</span>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function InventoryControlModal({
  open,
  onClose,
  activeBranchId,
  organizationId,
}: {
  open: boolean;
  onClose: () => void;
  activeBranchId: string;
  organizationId: string;
}) {
  const [lowStock, setLowStock] = useState<
    Array<{ id: string; name: string; stock_quantity: number; reorder_level: number }>
  >([]);
  const [forecast, setForecast] = useState<ForecastItem[]>([]);

  useEffect(() => {
    if (!open) return;
    getLowStockForBranchAction().then((res) => {
      if (res.success) setLowStock(res.items);
    });
    getInventoryForecastAction().then((res) => {
      if (res.success) setForecast(res.forecast);
    });
  }, [open, organizationId, activeBranchId]);

  return (
    <Modal open={open} onClose={onClose} title="Inventory Control" size="lg">
      <div className="space-y-4">
        <Link
          href="/dashboard/inventory?tab=intake"
          onClick={onClose}
          className="block w-full text-center bg-primary text-white py-2.5 rounded-xl text-xs font-bold"
        >
          Scan supplier invoice (AI)
        </Link>
        <div>
          <h4 className="text-[10px] font-bold uppercase text-on-surface-variant mb-2">Low stock</h4>
          {lowStock.length === 0 ? (
            <p className="text-xs text-on-surface-variant italic">No low stock alerts.</p>
          ) : (
            lowStock.slice(0, 8).map((p) => (
              <div key={p.id} className="text-xs py-1 flex justify-between">
                <span>{p.name}</span>
                <span className="text-amber-600 font-bold">{p.stock_quantity} left</span>
              </div>
            ))
          )}
        </div>
        {forecast.length > 0 && (
          <div>
            <h4 className="text-[10px] font-bold uppercase text-on-surface-variant mb-2">Forecast (30d)</h4>
            {forecast.slice(0, 5).map((f) => (
              <div key={f.productId} className="text-[10px] py-1 flex justify-between">
                <span>{f.name}</span>
                <span>
                  {f.daysUntilStockout != null ? `~${f.daysUntilStockout}d left` : '—'}
                </span>
              </div>
            ))}
          </div>
        )}
        <Link href="/dashboard/inventory" onClick={onClose} className="text-xs text-primary font-bold hover:underline">
          Open full inventory →
        </Link>
      </div>
    </Modal>
  );
}

function InvoicesQuickModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  return (
    <Modal open={open} onClose={onClose} title="Invoices" size="md">
      <p className="text-xs text-on-surface-variant mb-4">
        Sales & treatment billing, partial payments, and PDF receipts.
      </p>
      <div className="flex flex-col gap-2">
        <Link href="/dashboard/invoices" onClick={onClose} className="bg-primary text-white py-2 rounded-xl text-xs font-bold text-center">
          Billing ledger
        </Link>
        <Link href="/dashboard/walk-ins" onClick={onClose} className="border border-outline-variant py-2 rounded-xl text-xs font-bold text-center">
          Checkout queue
        </Link>
      </div>
    </Modal>
  );
}

function MultiBranchModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [branches, setBranches] = useState<
    Array<{ id: string; name: string; todayAppointments: number; activeQueue: number; readyCheckout: number }>
  >([]);

  useEffect(() => {
    if (!open) return;
    getBranchSummaryAction().then((res) => {
      if (res.success) setBranches(res.branches);
    });
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Multi Branch Control" size="lg">
      <div className="space-y-3">
        {branches.map((b) => (
          <div key={b.id} className="p-3 rounded-xl border border-outline-variant/40">
            <span className="text-xs font-bold text-on-surface">{b.name}</span>
            <div className="flex gap-4 mt-1 text-[10px] text-on-surface-variant">
              <span>Appts: {b.todayAppointments}</span>
              <span>Queue: {b.activeQueue}</span>
              <span>Checkout: {b.readyCheckout}</span>
            </div>
          </div>
        ))}
      </div>
      <Link href="/dashboard/branches" onClick={onClose} className="text-xs text-primary font-bold mt-4 inline-block hover:underline">
        Manage branches →
      </Link>
    </Modal>
  );
}

function LiveCameraModal({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [devices, setDevices] = useState<
    Array<{ id: string; name: string; snapshot_url: string | null; stream_url: string | null }>
  >([]);

  useEffect(() => {
    if (!open) return;
    listCameraDevicesAction().then((res) => {
      if (res.success) setDevices(res.devices);
    });
  }, [open]);

  return (
    <Modal open={open} onClose={onClose} title="Live Camera Feed" size="lg">
      {devices.length === 0 ? (
        <p className="text-xs text-on-surface-variant italic text-center py-6">
          No cameras configured. Clinic admin can add devices in Settings.
        </p>
      ) : (
        <div className="grid gap-4">
          {devices.map((d) => (
            <div key={d.id} className="rounded-xl border border-outline-variant/40 overflow-hidden">
              <p className="text-xs font-bold p-2 bg-surface-container/40">{d.name}</p>
              {d.snapshot_url ? (
                // eslint-disable-next-line @next/next/no-img-element
                <img src={d.snapshot_url} alt={d.name} className="w-full h-40 object-cover bg-black/20" />
              ) : (
                <div className="h-40 bg-surface-container/20 flex items-center justify-center text-xs text-on-surface-variant">
                  No snapshot URL configured
                </div>
              )}
            </div>
          ))}
        </div>
      )}
    </Modal>
  );
}

function AiAnalyticsSlideOver({ open, onClose }: { open: boolean; onClose: () => void }) {
  const [loading, setLoading] = useState(false);
  const [narrative, setNarrative] = useState('');
  const [metrics, setMetrics] = useState<Record<string, number> | null>(null);

  useEffect(() => {
    if (!open) return;
    setLoading(true);
    generateAiAnalyticsReportAction().then((res) => {
      if (res.success) {
        setNarrative(res.narrative || '');
        setMetrics(res.metrics || null);
      }
      setLoading(false);
    });
  }, [open]);

  return (
    <SlideOverPanel open={open} onClose={onClose} title="AI Analytic Reports" description="Business insights & recommendations">
      {loading ? (
        <Loader2 className="w-6 h-6 animate-spin mx-auto" />
      ) : (
        <div className="space-y-4">
          {metrics && (
            <div className="grid grid-cols-2 gap-2">
              <MetricCard label="Revenue (MTD)" value={`$${metrics.paidTotal?.toFixed(0)}`} />
              <MetricCard label="Unpaid" value={`$${metrics.unpaidTotal?.toFixed(0)}`} />
              <MetricCard label="Visits (MTD)" value={String(metrics.visitCount)} />
              <MetricCard label="Low stock" value={String(metrics.lowStockCount)} />
            </div>
          )}
          <div className="prose prose-sm text-xs text-on-surface-variant whitespace-pre-wrap">{narrative}</div>
          <Link href="/dashboard/reports" onClick={onClose} className="text-xs text-primary font-bold hover:underline">
            View detailed charts →
          </Link>
        </div>
      )}
    </SlideOverPanel>
  );
}

function MetricCard({ label, value }: { label: string; value: string }) {
  return (
    <div className="p-3 rounded-xl bg-surface-container/40 border border-outline-variant/30">
      <span className="text-[9px] font-bold uppercase text-on-surface-variant">{label}</span>
      <p className="text-lg font-bold text-on-surface">{value}</p>
    </div>
  );
}
