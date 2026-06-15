# Pet Clinic Dashboard Audit

Audit of VetFlow / ClinixDev role-based dashboards vs the pet-clinic flowchart plan.

## 1. Already Built (pre-effort baseline)

| Area | Status | Key paths |
|------|--------|-----------|
| Appointments (tabs, emergencies, follow-ups) | EXISTS | `app/dashboard/appointments/` |
| Walk-ins / queue via visits | EXISTS | `app/dashboard/walk-ins/` |
| Consultation workspace | EXISTS | `app/dashboard/doctors/[visitId]/` |
| Prescriptions + PDF | EXISTS | `app/dashboard/prescriptions/`, `app/api/prescriptions/[id]/pdf/` |
| Invoices / checkout | EXISTS | `app/dashboard/invoices/` |
| Inventory + OCR intake | EXISTS | `app/dashboard/inventory/` |
| Staff, branches, settings | EXISTS | `app/dashboard/staff/`, `branches/`, `settings/` |
| Reports (charts) | EXISTS | `app/dashboard/reports/` |
| AI Assistant | EXISTS | `app/dashboard/ai-assistant/` |
| Social automation | EXISTS | `app/dashboard/social/` |
| Live operations + medical activity | EXISTS | `LiveOperationsPanel`, `MedicalRecordActivityPanel` |
| Capabilities + feature flags | EXISTS | `lib/auth/capabilities.ts`, `lib/auth/features.ts` |

**Queue model:** `visits` statuses (`waiting` → `consulting` → `ready_for_checkout` → `completed`).

**Treatment records:** `clinical_notes` (no separate table).

---

## 2. Added in This Effort

### Phase 1 — Role QAB dashboards

| Item | Path |
|------|------|
| QAB config (admin 14, reception 6, doctor 6) | `components/dashboard/role-qab-config.ts` |
| Light-blue QAB grid | `components/dashboard/RoleQuickActionsGrid.tsx` |
| Slide-over panel | `components/ui/premium/SlideOverPanel.tsx` |
| Modal/slide-over launcher | `components/dashboard/DashboardWorkflowLauncher.tsx` |
| QAB shell wired on dashboard | `components/dashboard/DashboardQabShell.tsx`, `app/dashboard/page.tsx` |

**Phase 1 modals:** Appointment wizard, patient search, role permissions explainer, staff quick link, consultation status (read-only live ops), treatment record (today), follow-up check-in, inventory control, invoices quick, multi-branch summary, live camera, AI assistant slide-over, social slide-over, AI analytic reports slide-over.

### Phase 1 — Clinical

| Item | Path |
|------|------|
| Visit type selector (Standard / Lab / Surgery) | `components/forms/ConsultationWorkspaceClient.tsx` |
| Surgery fields on clinical notes | migration `12_clinical_visit_types.sql`, `clinical-actions.ts` |
| Lab flow guard (order lab before complete) | `ConsultationWorkspaceClient.tsx` |

### Phase 2 — Inventory, billing, labs

| Item | Path |
|------|------|
| `treats` product type | migration 12, `ProductSchema`, inventory type tabs |
| Catalog type tabs | `components/inventory/InventoryCatalogClient.tsx` |
| Inventory forecast in QAB modal | `lib/inventory/forecast.ts`, `getInventoryForecastAction` |
| Partial payments at checkout | `CheckoutSchema`, `billing-actions.ts`, `InvoiceCheckoutClient.tsx` |
| Partial payment on existing invoices | `updateInvoicePaymentStatusAction` (amount support) |
| Invoice list partial filter/badge | `InvoicesListClient.tsx` |
| Lab result text UI + status labels | `ConsultationLabsDocsPanel.tsx` |
| Lab result export | `app/api/lab-orders/[id]/pdf/route.ts` |
| Doctor treatment PDF access | `view_treatment_pdf` on `app/api/visits/[visitId]/treatment-pdf/route.ts` |

### Phase 3 — AI, camera, benchmarking

| Item | Path |
|------|------|
| AI analytic narrative (Groq) | `lib/services/ai-analytics-actions.ts`, QAB slide-over |
| Camera devices migration | `db/migrations/13_camera_feeds.sql` |
| Camera list/create actions | `lib/services/camera-actions.ts` |
| Live camera QAB modal | `DashboardWorkflowLauncher.tsx` |
| Admin camera CRUD in settings | `components/settings/CameraDevicesClient.tsx` |
| Clinic benchmarking page | `app/dashboard/benchmarking/page.tsx` |
| Cross-branch compare action | `lib/services/benchmarking-actions.ts` |
| Super-admin platform aggregates | `getSuperAdminBenchmarkingAction()` |

### Auth / permissions

| Capability | Roles |
|------------|-------|
| `view_consultation_status` | admin, reception |
| `view_treatment_pdf` | admin, doctor |
| `view_camera_feed` | admin, reception |
| `manage_camera_devices` | admin |

**Opt-in features:** `clinic_benchmarking`, `camera_feed` (super-admin toggles in `subscription_status.features`).

---

## 3. Still Remaining / Deferred

| Item | Notes |
|------|-------|
| True RTSP/HLS live streaming | MVP uses snapshot URL refresh; external stream service needed for production |
| Custom RBAC / role builder | Fixed roles + read-only explainer modal; custom `custom_roles` tables deferred |
| Dental / other clinic verticals | Out of vet MVP scope |
| Full PDF lab reports | Current route exports plain-text report; react-pdf template optional |
| `app/dashboard/reports/ai` full page | Covered by QAB slide-over + link to charts |
| Migration apply on remote Supabase | Run `11_workflow_upgrades.sql`, `12_clinical_visit_types.sql`, `13_camera_feeds.sql` |

---

## 4. QAB → Route/Modal Map

### Clinic Admin (14 QABs)

| QAB | Launcher | Target |
|-----|----------|--------|
| Role Creation | modal | `role_creation` |
| Staff Management | modal | `staff_management` → `/dashboard/staff` |
| Inventory Control | modal | `inventory_control` |
| Appointment | modal | `appointment` (NewAppointmentWizard) |
| Patient Profile | modal | `patient_profile` (search) |
| Invoices | modal | `invoices` |
| AI Analytic Reports | slideover | `ai_analytic_reports` |
| Consultations | modal | `consultation_status` (LiveOperationsPanel) |
| Prescriptions | page | `/dashboard/prescriptions` |
| Social Media | slideover | `social_media` |
| Live Camera Feed | modal | `live_camera` |
| Multi Branch Control | modal | `multi_branch` |
| Clinic Benchmarking | page | `/dashboard/benchmarking` |
| AI Assistant | slideover | `ai_assistant` |

### Reception (6 QABs)

| QAB | Launcher | Target |
|-----|----------|--------|
| Appointment | modal | `appointment` |
| Invoices | modal | `invoices` |
| Consultations | modal | `consultation_status` |
| Inventory Control | modal | `inventory_control` |
| AI Assistant | slideover | `ai_assistant` |
| Live Camera Feed | modal | `live_camera` |

### Doctor (6 QABs)

| QAB | Launcher | Target |
|-----|----------|--------|
| Queue | page | `/dashboard/doctors` |
| Appointments | page | `/dashboard/appointments` |
| Pet Patient Profile | modal | `patient_profile` |
| Treatment Record | modal | `treatment_record` |
| Consultation | page | `/dashboard/doctors` |
| Next Appointment Check-in | modal | `next_appointment_checkin` |

---

## 5. Migration Checklist

| Migration | Purpose | Apply on Supabase |
|-----------|---------|-------------------|
| `11_workflow_upgrades.sql` | Services catalog, visit_services, follow-up appointments, consult_started_at | Required |
| `12_clinical_visit_types.sql` | visit_type, procedure_notes, post_op_medication, treats product type | Required |
| `13_camera_feeds.sql` | camera_devices, camera_recordings + RLS | Required for camera QAB |

```bash
# Local / CLI example
supabase db push
# or apply each file via Supabase SQL editor / MCP apply_migration
```

---

## 6. Server Actions Reference

| Action | File |
|--------|------|
| QAB data (treatment records, follow-ups, branches, low stock, forecast) | `lib/services/dashboard-qab-actions.ts` |
| AI analytics narrative | `lib/services/ai-analytics-actions.ts` |
| Camera devices | `lib/services/camera-actions.ts` |
| Benchmarking | `lib/services/benchmarking-actions.ts` |

---

*Generated as part of the Pet Clinic Role-Based Dashboards implementation.*
