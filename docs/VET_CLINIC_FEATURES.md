# ClinixDev / VetFlow — Features for Veterinary Clinics

Product positioning: multi-branch veterinary practice management (PMS) with reception, clinical, billing, inventory, and optional AI/social add-ons.

**App name in UI:** ClinixDev  
**Repo:** Vetflow

---

## 1. User roles & access

| Role | Purpose |
|------|---------|
| **Clinic Admin** | Full clinic operations, staff, branches, settings, reports, subscription |
| **Doctor** | Consultations, prescriptions, patient history, appointments (view), AI assistant |
| **Receptionist** | Front desk: appointments, walk-ins, customers, pets, billing, inventory |

Access is enforced via **capabilities** and **subscription feature flags** per organization.

---

## 2. Subscription feature modules

These can be enabled/disabled per organization (super-admin / plan):

| Feature flag | Label | What it unlocks |
|--------------|-------|-----------------|
| `appointments` | Appointments & walk-ins | Scheduling, walk-in queue, public booking |
| `inventory` | Inventory management | Catalog, stock, supplier invoice OCR intake |
| `sales` | Sales & invoicing | Invoices, checkout, payments |
| `reports` | Advanced reports | Analytics charts, AI analytic reports |
| `multi_branch` | Multi-branch access | Multiple clinic locations, branch switcher |
| `ai_assistant` | AI assistant | In-app clinic chatbot (Groq) |
| `social_automation` | Social media automation | Meta (Facebook/Instagram) posting |

**Opt-in (super-admin must enable explicitly):**

| Feature flag | Label |
|--------------|-------|
| `branded_pdfs` | Branded PDF documents |
| `consult_tracking` | Consultation time tracking |
| `clinic_benchmarking` | Cross-branch benchmarking |
| `camera_feed` | Live camera feed (snapshot URLs) |

---

## 3. Dashboard & navigation

- **Role-based home dashboard** with KPI widgets (appointments today, walk-ins, checkout queue, invoices, low stock, etc.)
- **Quick Action Buttons (QAB)** — role-specific shortcuts (admin: 14, reception: 6, doctor: 6)
- **Branch switcher** (multi-branch orgs)
- **Global search** (⌘K) — customers, pets, invoices
- **My Profile** — name, phone, password, profile photo
- **Blurred navigation loading** + branded favicon during route changes
- **Upgrade / subscription** page for plan management

---

## 4. Appointments & scheduling

**Routes:** `/dashboard/appointments`, `/dashboard/schedule`

- Book appointments (staff wizard: customer lookup, new pet, doctor, date/time, reason, emergency flag)
- **Multi-provider day calendar** — columns per doctor, 7 AM–7 PM grid, duration blocks
- Date filters: Today, Tomorrow, custom date (URL `?date=`)
- Appointment lifecycle: requested → confirmed → rescheduled → checked-in → completed / cancelled / no-show
- Confirm, reschedule, cancel, mark no-show, mark emergency
- Check-in from appointments (assign attending vet → creates visit)
- Follow-up appointments linked to prior visits
- Tabs: Upcoming, Emergency, Closed
- **Public online booking** — `/book/{clinicSlug}` for pet owners (request slot; staff confirms)

---

## 5. Walk-ins & visit queue

**Route:** `/dashboard/walk-ins`

- Register walk-in visits (patient lookup, reason, emergency, assign vet)
- Live visit queue: **waiting → consulting → ready for checkout → completed**
- Reception view of consulting visits (including **paused consultation** status)
- Checkout queue handoff to billing

---

## 6. Customers & pets

**Routes:** `/dashboard/customers`, `/dashboard/pets`

- Customer CRM: name, phone, email, address, branch
- Pet/patient records: species, breed, gender, DOB, weight, allergies, medical notes
- Creatable species dropdown (Dog, Cat, Bird, etc. + custom)
- Customer detail → pets list; pet detail → visit history
- Patient lookup panel (phone search) reused in walk-ins and appointment wizard

---

## 7. Clinical / consultations

**Routes:** `/dashboard/doctors`, `/dashboard/doctors/[visitId]`

### Consultation workspace (SOAPDRx)

- Tabbed clinical notes: **S**, **O**, **A**, **P**, **D** (diagnostics/labs), **Rx** (prescriptions)
- **Tab gating** — required fields before advancing; draft auto-save
- Visit types: **Standard**, **Lab**, **Surgery**
- Vitals: temperature, heart rate, respiratory rate, weight
- Services performed (from service catalog)
- Prescription lines linked to inventory catalog or free-text
- Quick-add catalog items from consultation
- Follow-up recommendations (preset day intervals)
- **Pause / resume consultation** with reason and timer
- Pet visit history sidebar
- Lab orders & document uploads panel
- Complete consultation → moves visit toward checkout

### Doctor queue

- Waiting and active (consulting) visits for assigned doctor
- Access to patient medical profile / history

---

## 8. Prescriptions

**Route:** `/dashboard/prescriptions`

- List finalized prescriptions
- **Prescription PDF** export
- Treatment / visit summary **PDF** for doctors

---

## 9. Billing & invoicing

**Routes:** `/dashboard/invoices`

- Create invoice from completed visit
- Line items: services, products, tax
- Payment methods: cash, card, bank transfer
- **Partial payments** at checkout and on existing invoices
- Invoice PDF export
- Payment status tracking (paid, partial, unpaid)
- Receptionist billing/checkout workflow from walk-in queue

---

## 10. Inventory & catalog

**Route:** `/dashboard/inventory` (Catalog + Scan supplier invoice tabs)

### Product catalog

- Types: **Service**, Medicine, Food, Treats, Accessory
- Categories (creatable per org)
- Per-branch stock, reorder levels, purchase/selling price
- Stock adjustment (manual, purchase, expired, return)
- Low-stock alerts on dashboard
- Inventory forecast (QAB modal)

### Supplier invoice intake (OCR)

- Upload invoice image (JPG/PNG/WebP)
- AI extraction of line items (Groq / OpenAI)
- Review modal: match to catalog or create new product
- **Product type & category** per new line on intake
- Confirm intake → updates stock + stock movements audit

---

## 11. Reports & analytics

**Routes:** `/dashboard/reports`, `/dashboard/benchmarking` (opt-in)

- 6-month revenue and visit trend charts
- KPI summary cards
- **AI analytic narrative** reports (Groq) via dashboard QAB
- **Clinic benchmarking** — compare branches/metrics (opt-in)

---

## 12. Staff & attendance

**Route:** `/dashboard/staff`

- Invite staff (admin, doctor, receptionist roles)
- Assign staff to branches
- **Weekly schedule templates** + one-off shift overrides
- Generate shifts from templates
- **Daily attendance** sync (present, late, absent, off)
- Staff attendance overview on admin dashboard

---

## 13. Branches & multi-location

**Route:** `/dashboard/branches`

- Create/edit clinic branches (name, address)
- Branch-scoped data (appointments, visits, inventory, invoices)
- Active branch cookie / switcher

---

## 14. Clinic settings

**Route:** `/dashboard/settings`

- Timezone & currency
- Clinic contact info & logo
- **Tax settings** (name, rate, applies to products/services)
- **Services catalog** (consultation, vaccination, surgery fees, etc.)
- **PDF branding** (accent color, footer) when enabled
- **Camera devices** CRUD when camera feed enabled

---

## 15. AI assistant

**Route:** `/dashboard/ai-assistant`

- Clinic-scoped AI chat for workflows, drafts, operational guidance
- Powered by configured LLM (Groq)
- Also available as dashboard slide-over (QAB)

---

## 16. Social media automation

**Route:** `/dashboard/social`

- Connect Facebook / Instagram (Meta OAuth)
- AI-assisted post drafting
- Schedule/publish social posts per branch

---

## 17. Live camera feed (opt-in)

- Register camera snapshot URLs per branch (settings)
- View refreshed snapshots from dashboard QAB / reception
- *Note: MVP uses snapshot URLs, not full RTSP/HLS streaming*

---

## 18. Documents & labs

- Upload documents to visits (categories)
- Lab test catalog
- Lab orders per visit with status workflow
- Lab result text entry
- **Lab order PDF** export

---

## 19. Public & onboarding (clinic-facing)

| Route | Purpose |
|-------|---------|
| `/register` | New clinic registration |
| `/login` | Staff login |
| `/account-setup` | Post-signup branch/org setup |
| `/request-access` | Request platform access |
| `/book/{clinicSlug}` | Public appointment request portal |
| `/suspended` | Account suspended state |

---

## 20. PDF & document exports

| Export | Description |
|--------|-------------|
| Invoice PDF | Branded or default clinic invoice |
| Prescription PDF | Finalized Rx for pet owner |
| Treatment / visit PDF | Clinical summary for doctors |
| Lab order PDF | Lab request / results export |

Branded styling when `branded_pdfs` is enabled.

---

## 21. Security & audit

- Organization-scoped Row Level Security (Supabase)
- Role + capability checks on routes and server actions
- Feature flags per subscription plan
- Audit logging for sensitive actions

---

## 22. Platform-only (not sold to clinics)

- Super Admin portal — org registry, billing, users, audit
- Platform impersonation of clinic accounts

---

## 23. Planned / partial

| Item | Status |
|------|--------|
| True RTSP/HLS live camera streaming | MVP = snapshot refresh only |
| Custom RBAC / role builder | Fixed roles + permissions explainer |
| Full rich PDF lab reports | Plain-text lab PDF today |

---

*Document generated from ClinixDev / VetFlow codebase — capabilities, features, routes, and product audit.*
