-- ====================================================================
-- 03_attendance_shifts.sql
-- Staff scheduling (shifts) + daily attendance (check-in/check-out).
-- Multi-tenant, branch-scoped, RLS-protected. Follows the helper-function
-- conventions established in 01_init.sql (get_user_organizations,
-- has_org_role, is_super_admin) and the hardening in 02_security_perf_fixes.sql
-- (pinned search_path, explicit grants, covering FK indexes).
-- ====================================================================

-- ====================================================================
-- 1. SHIFTS (scheduled work shifts assigned to staff)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.shifts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    shift_date DATE NOT NULL,
    start_time TIME NOT NULL,
    end_time TIME NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'scheduled', -- scheduled | completed | cancelled
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT shifts_time_order CHECK (end_time > start_time)
);

CREATE TRIGGER update_shifts_updated_at
    BEFORE UPDATE ON public.shifts
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 2. ATTENDANCE RECORDS (one row per staff member per work day)
-- ====================================================================
CREATE TABLE IF NOT EXISTS public.attendance_records (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    shift_id UUID REFERENCES public.shifts(id) ON DELETE SET NULL,
    work_date DATE NOT NULL,
    check_in_at TIMESTAMP WITH TIME ZONE,
    check_out_at TIMESTAMP WITH TIME ZONE,
    status VARCHAR(20) NOT NULL DEFAULT 'present', -- present | late | absent | on_leave
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (organization_id, user_id, work_date)
);

CREATE TRIGGER update_attendance_records_updated_at
    BEFORE UPDATE ON public.attendance_records
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

-- ====================================================================
-- 3. COVERING INDEXES (foreign keys + common query paths)
-- ====================================================================
CREATE INDEX IF NOT EXISTS idx_shifts_organization ON public.shifts (organization_id);
CREATE INDEX IF NOT EXISTS idx_shifts_branch ON public.shifts (branch_id);
CREATE INDEX IF NOT EXISTS idx_shifts_user ON public.shifts (user_id);
CREATE INDEX IF NOT EXISTS idx_shifts_created_by ON public.shifts (created_by);
CREATE INDEX IF NOT EXISTS idx_shifts_org_date ON public.shifts (organization_id, shift_date);

CREATE INDEX IF NOT EXISTS idx_attendance_organization ON public.attendance_records (organization_id);
CREATE INDEX IF NOT EXISTS idx_attendance_branch ON public.attendance_records (branch_id);
CREATE INDEX IF NOT EXISTS idx_attendance_user ON public.attendance_records (user_id);
CREATE INDEX IF NOT EXISTS idx_attendance_shift ON public.attendance_records (shift_id);
CREATE INDEX IF NOT EXISTS idx_attendance_org_date ON public.attendance_records (organization_id, work_date);

-- ====================================================================
-- 4. ENABLE ROW LEVEL SECURITY
-- ====================================================================
ALTER TABLE public.shifts ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.attendance_records ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 5. RLS POLICIES
-- ====================================================================

-- SHIFTS: any active org member can view their clinic's schedule.
-- Only clinic admins (or super admin) can create/modify shift assignments.
DROP POLICY IF EXISTS select_shifts ON public.shifts;
CREATE POLICY select_shifts ON public.shifts
    FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organizations())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS manage_shifts ON public.shifts;
CREATE POLICY manage_shifts ON public.shifts
    FOR ALL USING (
        public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    )
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    );

-- ATTENDANCE: staff can see and manage their own records; clinic admins
-- (and super admin) get full visibility and control across the clinic.
DROP POLICY IF EXISTS select_attendance ON public.attendance_records;
CREATE POLICY select_attendance ON public.attendance_records
    FOR SELECT USING (
        user_id = auth.uid()
        OR public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    );

-- A staff member may check in for themselves; admins may create on anyone's behalf.
DROP POLICY IF EXISTS insert_attendance ON public.attendance_records;
CREATE POLICY insert_attendance ON public.attendance_records
    FOR INSERT WITH CHECK (
        (
            user_id = auth.uid()
            AND organization_id IN (SELECT public.get_user_organizations())
        )
        OR public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    );

-- A staff member may check out / annotate their own record; admins may correct any.
DROP POLICY IF EXISTS update_attendance ON public.attendance_records;
CREATE POLICY update_attendance ON public.attendance_records
    FOR UPDATE USING (
        user_id = auth.uid()
        OR public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    )
    WITH CHECK (
        user_id = auth.uid()
        OR public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    );

-- Only clinic admins / super admin may delete attendance rows.
DROP POLICY IF EXISTS delete_attendance ON public.attendance_records;
CREATE POLICY delete_attendance ON public.attendance_records
    FOR DELETE USING (
        public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    );

-- ====================================================================
-- 6. GRANTS (RLS still applies; these expose the tables to API roles)
-- ====================================================================
GRANT SELECT, INSERT, UPDATE, DELETE ON public.shifts TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.attendance_records TO authenticated;
