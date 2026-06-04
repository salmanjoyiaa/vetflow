# VetFlow Cursor Best-Practice Implementation Prompt

You are working inside a Next.js App Router + Supabase SSR application for VetFlow.

Your task is to implement the new premium role-based dashboard roadmap in a safe, phased, production-minded way.

## Primary Goal

Upgrade the existing VetFlow UI and dashboard experience into a premium multi-role platform without weakening tenant isolation, Supabase RLS, branch scoping, or role-based access control.

The app already has:

- Next.js App Router
- Supabase SSR
- Auth server actions
- Shared clinic dashboard shell
- Separate super-admin shell
- RLS-driven data access
- Existing clinic, doctor, receptionist, booking, login, register, and account setup routes

Do not rewrite the whole app blindly. Preserve the current architecture where it is already correct, and improve it incrementally.

---

## Core Decisions

Follow these product and architecture decisions:

1. Refresh both the public homepage and authenticated dashboards.
2. Clinic users should share one premium dashboard shell.
3. Inside the shared clinic shell, show role-specific workspaces and navigation.
4. Phase 1 must support:
   - `super_admin`
   - `clinic_admin`
   - `doctor`
   - `receptionist`
   - inventory or billing operator capabilities if already present or required
5. Clinic admins should have organization-wide branch visibility.
6. Staff users should only access assigned branches.
7. Super admins may have full visibility only through explicit, audited flows.
8. Impersonation, if implemented, must be visible, logged, reversible, and isolated from normal tenant behavior.

---

## Non-Negotiable Security Rules

Before making UI changes, inspect the current auth, middleware, layout, and RLS flow.

Do not introduce:

- Client-side-only authorization
- Cross-tenant data access
- Branch leakage
- Service-role access in normal clinic views
- Super-admin logic inside the shared clinic shell
- Hardcoded privilege assumptions
- Unsafe impersonation
- Unscoped Supabase queries

Every server-rendered page, server action, and data helper must work from explicit session context:

```ts
{
  userId,
  role,
  organizationId,
  activeBranchId,
  allowedBranchIds,
  isSuperAdmin
}
```

Use this context consistently for routing, navigation, page guards, and database access.

---

## Cursor Working Instructions

Work in small, reviewable steps.

Before editing:

1. Inspect the existing route tree.
2. Inspect auth/session helpers.
3. Inspect middleware.
4. Inspect dashboard layouts.
5. Inspect Supabase client setup.
6. Inspect RLS migrations and policies.
7. Identify reusable components before creating new ones.

After inspecting, briefly summarize:

- Current route ownership
- Existing role model
- Current branch-scoping behavior
- Any security gaps found
- Proposed first implementation step

Then implement one phase at a time.

Do not delete large areas of code unless necessary. Prefer refactoring, extracting, and replacing incrementally.

---

## Phase 1: Discovery and Architecture Audit

Audit these files first:

- `app/layout.tsx`
- `app/page.tsx`
- `middleware.ts`
- `lib/services/auth.ts`
- `lib/services/auth-actions.ts`
- `lib/supabase/server.ts`
- `db/migrations/01_init.sql`
- `components/layout/DashboardShellClient.tsx`
- `app/dashboard/layout.tsx`
- `app/dashboard/page.tsx`
- `app/dashboard/doctors/page.tsx`
- `app/dashboard/staff/page.tsx`
- `app/dashboard/walk-ins/page.tsx`
- `app/super-admin/layout.tsx`
- `app/super-admin/dashboard/page.tsx`
- `app/super-admin/organizations/page.tsx`
- `app/account-setup/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/book/[clinicSlug]/page.tsx`

Also inspect the stitched design references:

- `stitch_vetflow_ai/clinicos_master/DESIGN.md`
- `stitch_vetflow_ai/clinicos_ai_master_dashboard/code.html`
- `stitch_vetflow_ai/clinicos_ai_premium_upgrade_pathway/code.html`
- `stitch_vetflow_ai/clinicos_ai_dermaluxe_subscription_node/code.html`
- `stitch_vetflow_ai/clinicos_ai_salik_pets_subscription_node/code.html`
- `stitch_vetflow_ai/clinicos_ai_vet_laghari_subscription_node/code.html`

Deliverables:

- Route ownership map
- Role matrix
- Branch-scoping matrix
- Super-admin access policy
- Impersonation policy recommendation
- List of screens to reuse, restyle, or rebuild

---

## Phase 2: Security Foundation and Session Hardening

Improve the server session model so all protected areas use explicit role and branch context.

Tasks:

- Refine the server session helper.
- Ensure middleware and layouts use the same authorization source.
- Ensure dashboard routing is based on role and assignment state.
- Review RLS policies for organization, branch, and role scoping.
- Keep service-role Supabase access isolated to approved super-admin or onboarding paths only.
- Add safe tenant-switch or impersonation support only if the current architecture can support it securely.

Acceptance Criteria:

- Clinic users cannot access other organizations.
- Doctors and receptionists are branch-bounded.
- Clinic admins can access organization-wide branch data.
- Super-admin access is explicit and isolated.
- No client-only privilege enforcement.
- Server actions cannot bypass role or branch scope.

---

## Phase 3: Public Homepage and Onboarding Refresh

Rebuild or restyle the public-facing journey using the premium visual language.

Pages:

- `app/page.tsx`
- `app/login/page.tsx`
- `app/register/page.tsx`
- `app/account-setup/page.tsx`
- `app/book/[clinicSlug]/page.tsx`

Requirements:

- Keep the existing brand identity.
- Match the premium design language from the stitched mockups.
- Preserve register → organization creation → first branch → first admin flow.
- Keep room for future invite-based staff onboarding.
- Ensure public booking remains tenant-slug aware.
- Make the experience responsive.

Acceptance Criteria:

- Homepage has a clear conversion path.
- Auth pages visually match the new system.
- Account setup handles empty and unassigned states.
- Booking page aligns with the new design language.
- No protected data is exposed publicly.

---

## Phase 4: Super-Admin Control Center

Rebuild the super-admin dashboard as the platform master console.

Routes:

- `app/super-admin/layout.tsx`
- `app/super-admin/dashboard/page.tsx`
- `app/super-admin/organizations/page.tsx`

Features:

- Tenant registry
- Platform metrics
- Subscription states
- Recent signups
- System health panels
- Tenant activation/suspension/review actions
- Optional audited impersonation

Requirements:

- Do not reuse the clinic dashboard shell accidentally.
- Super-admin routes must remain isolated.
- Aggregate reads may use service-role access only where approved.
- Impersonation must show a visible banner and return-to-admin action.

Acceptance Criteria:

- Only `super_admin` can access these pages.
- Tenant list and billing telemetry render correctly.
- No tenant can see super-admin data.
- Audit logs are visible to super-admin only.
- Tenant-side users cannot mutate audit history.

---

## Phase 5: Shared Premium Clinic Shell

Upgrade the shared clinic shell into a reusable premium workspace.

Main file:

- `components/layout/DashboardShellClient.tsx`

Also review:

- `app/dashboard/layout.tsx`

Build reusable primitives for:

- KPI cards
- Glass panels
- Telemetry bars
- Activity feeds
- Charts
- Empty states
- CTA blocks
- Role-aware sidebar items
- Branch selector
- Loading and denied-access states

Navigation must be capability-based, not hardcoded only by route presence.

Requirements:

- Shared shell supports `clinic_admin`, `doctor`, `receptionist`, and future staff variants.
- Branch selector respects role and assignment.
- Navigation respects role and capability.
- Visual style follows the dark premium enterprise UI from the stitched mockups.
- Keep the app functional during transition.

Acceptance Criteria:

- Shell is responsive.
- Sidebar and top bar behave correctly.
- Branch selector cannot expose unauthorized branches.
- Role-specific navigation is correct.
- Loading, empty, and denied states are polished and safe.

---

## Phase 6: Role-Specific Clinic Workspaces

Implement or restyle role-specific pages inside the shared clinic shell.

### Clinic Admin Workspace

Include:

- Dashboard overview
- Branches
- Staff
- Settings
- Subscription or plan management
- Clinic-wide operational panels

Relevant baseline:

- `app/dashboard/page.tsx`
- `app/dashboard/staff/page.tsx`

### Doctor Workspace

Include:

- Assigned consultations
- Active queue
- Patient history
- Clinical notes
- Prescriptions
- AI-assisted clinical modules only where approved

Relevant baseline:

- `app/dashboard/doctors/page.tsx`

### Receptionist Workspace

Include:

- Walk-ins
- Appointment intake
- Customer and pet registration
- Schedule board
- Billing checkout
- Queue triage

Relevant baseline:

- `app/dashboard/walk-ins/page.tsx`

### Inventory or Billing Operators

If needed, add these as capability-based views inside the shared shell. Do not create an ungoverned dashboard.

Acceptance Criteria:

- Every role sees only allowed navigation.
- Every role sees only allowed data.
- Queue, chart, and branch pages are branch-aware.
- Doctor pages only show assigned or permitted consults.
- Receptionist pages do not expose restricted clinical data.

---

## Phase 7: Subscription and Premium Upgrade Flow

Build the upgrade pathway as a state-aware conversion surface.

Reference:

- `stitch_vetflow_ai/clinicos_ai_premium_upgrade_pathway/code.html`

Requirements:

- Tie upgrade UI to real tenant subscription state.
- Show correct state for trial, active, growth, and enterprise accounts.
- Use premium node visuals for:
  - Plan comparison
  - Feature unlocks
  - AI module messaging
  - Projected savings or growth analytics
- Sync subscription state across clinic and super-admin views.

Acceptance Criteria:

- Plan comparison renders correctly.
- Trial and active states are distinct.
- Upgrade CTAs only appear where appropriate.
- Billing state is consistent between super-admin and clinic views.

---

## Phase 8: Verification and Validation

Before considering the work complete, run focused checks.

Required validation:

1. Route guards
2. Middleware redirects
3. Server action permissions
4. RLS expectations
5. Organization isolation
6. Branch isolation
7. Super-admin isolation
8. Account setup flow
9. Public booking flow
10. Empty/loading/denied states

Security tests to manually reason through:

- URL manipulation cannot reveal another clinic’s data.
- Cookie/session tampering cannot escalate access.
- Direct server action calls cannot bypass role checks.
- Staff cannot access unassigned branches.
- Clinic users cannot access super-admin routes.
- Super-admin service-role access does not leak into tenant UI.

Run after each phase:

```bash
npm run lint
npm run typecheck
npm run build
```

If any script does not exist, inspect `package.json` and use the closest available validation command.

---

## Implementation Style

Use:

- Type-safe server helpers
- Small reusable components
- Explicit role/capability maps
- Server-side authorization first
- Progressive UI replacement
- Existing Supabase patterns where safe
- Clear loading, empty, and denied states

Avoid:

- Large unrelated rewrites
- Hardcoded tenant IDs
- Hardcoded branch assumptions
- Client-only guards
- Duplicated dashboard shells
- Service-role access in normal tenant pages
- Visual-only changes that ignore security boundaries

---

## Final Output Expected

When finished with a phase, provide:

1. Files changed
2. What was implemented
3. Security considerations addressed
4. Any assumptions made
5. Any remaining risks or TODOs
6. Commands run and results

Start with Phase 1 discovery and do not begin broad implementation until the current architecture has been inspected.

---

## Implementation Status (updated 2026-06-02)

Phases 1–8 from the premium roadmap have been implemented in this repo. Paste this file in chat to continue polish or next features.

### Completed

| Phase | Status | Key artifacts |
|-------|--------|----------------|
| 2 Security | Done | [`lib/auth/context.ts`](lib/auth/context.ts), [`lib/auth/capabilities.ts`](lib/auth/capabilities.ts), [`middleware.ts`](middleware.ts), [`lib/services/branch-cookie-actions.ts`](lib/services/branch-cookie-actions.ts) |
| 3 Public UI | Done | Dark ClinicOS tokens in [`app/globals.css`](app/globals.css), [`app/layout.tsx`](app/layout.tsx), homepage/login/register/account-setup/booking |
| 4 Super-admin | Done | [`app/super-admin/layout.tsx`](app/super-admin/layout.tsx), dashboard KPIs |
| 5 Clinic shell | Done | [`components/layout/DashboardShellClient.tsx`](components/layout/DashboardShellClient.tsx) — capability nav, httpOnly branch cookie |
| 6 Role workspaces | Done | Role quick links on [`app/dashboard/page.tsx`](app/dashboard/page.tsx), page guards with [`DeniedState`](components/ui/premium/DeniedState.tsx) |
| 7 Subscription | Done | [`app/dashboard/upgrade/page.tsx`](app/dashboard/upgrade/page.tsx) |
| 8 Validation | Done | `npm run typecheck`, `npm run build` pass |

### Session model (use everywhere server-side)

```ts
import { resolveServerAuthContext, assertBranchAccess, assertCapability } from '@/lib/auth/context';
const ctx = await resolveServerAuthContext();
// ctx: userId, role, organizationId, activeBranchId, allowedBranchIds, capabilities, isSuperAdmin
```

### Commands

```bash
npm run lint
npm run typecheck
npm run build
```

### Remaining polish

1. Run migration [`db/migrations/02_impersonation.sql`](db/migrations/02_impersonation.sql) on Supabase.
2. Configure Stripe env vars in `.env.local` (see `.env.example`) and add webhook handler for subscription sync.
3. Some dashboard form components may still need manual dark-theme tweaks after bulk migration.
4. Impersonation uses service-role reads; RLS does not apply to super-admin impersonation session (audited via `impersonation_sessions` + audit logs).

### How to continue in Cursor

1. Paste this file as the first message.
2. State the phase or feature (e.g. "polish walk-ins page dark UI" or "add Stripe to upgrade").
3. Ask the agent to run typecheck + build before finishing.
