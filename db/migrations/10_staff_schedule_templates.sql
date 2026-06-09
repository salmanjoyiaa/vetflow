-- ====================================================================
-- 10_staff_schedule_templates.sql
-- Recurring weekly shift templates + one-off exceptions for staff scheduling.
-- Generated shift instances remain in public.shifts (03_attendance_shifts.sql).
-- ====================================================================

CREATE TABLE IF NOT EXISTS public.staff_schedule_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    weekday SMALLINT NOT NULL CHECK (weekday >= 0 AND weekday <= 6),
    start_time TIME,
    end_time TIME,
    is_off_day BOOLEAN NOT NULL DEFAULT false,
    effective_from DATE NOT NULL DEFAULT CURRENT_DATE,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT staff_schedule_templates_time_order CHECK (
        is_off_day = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),
    UNIQUE (organization_id, user_id, branch_id, weekday)
);

CREATE TRIGGER update_staff_schedule_templates_updated_at
    BEFORE UPDATE ON public.staff_schedule_templates
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE TABLE IF NOT EXISTS public.staff_schedule_exceptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    exception_date DATE NOT NULL,
    is_off_day BOOLEAN NOT NULL DEFAULT true,
    start_time TIME,
    end_time TIME,
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    CONSTRAINT staff_schedule_exceptions_time_order CHECK (
        is_off_day = true OR (start_time IS NOT NULL AND end_time IS NOT NULL AND end_time > start_time)
    ),
    UNIQUE (organization_id, user_id, exception_date)
);

CREATE TRIGGER update_staff_schedule_exceptions_updated_at
    BEFORE UPDATE ON public.staff_schedule_exceptions
    FOR EACH ROW EXECUTE FUNCTION public.update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_schedule_templates_org ON public.staff_schedule_templates (organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_user ON public.staff_schedule_templates (user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_templates_branch ON public.staff_schedule_templates (branch_id);

CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_org ON public.staff_schedule_exceptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_user ON public.staff_schedule_exceptions (user_id);
CREATE INDEX IF NOT EXISTS idx_schedule_exceptions_date ON public.staff_schedule_exceptions (organization_id, exception_date);

ALTER TABLE public.staff_schedule_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.staff_schedule_exceptions ENABLE ROW LEVEL SECURITY;

DROP POLICY IF EXISTS select_schedule_templates ON public.staff_schedule_templates;
CREATE POLICY select_schedule_templates ON public.staff_schedule_templates
    FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organizations())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS manage_schedule_templates ON public.staff_schedule_templates;
CREATE POLICY manage_schedule_templates ON public.staff_schedule_templates
    FOR ALL USING (
        public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    )
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS select_schedule_exceptions ON public.staff_schedule_exceptions;
CREATE POLICY select_schedule_exceptions ON public.staff_schedule_exceptions
    FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organizations())
        OR public.is_super_admin()
    );

DROP POLICY IF EXISTS manage_schedule_exceptions ON public.staff_schedule_exceptions;
CREATE POLICY manage_schedule_exceptions ON public.staff_schedule_exceptions
    FOR ALL USING (
        public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    )
    WITH CHECK (
        public.has_org_role(organization_id, ARRAY['clinic_admin'])
        OR public.is_super_admin()
    );

GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_schedule_templates TO authenticated;
GRANT SELECT, INSERT, UPDATE, DELETE ON public.staff_schedule_exceptions TO authenticated;
