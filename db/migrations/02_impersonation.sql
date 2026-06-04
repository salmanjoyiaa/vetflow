-- Impersonation sessions for audited super-admin tenant access
CREATE TABLE IF NOT EXISTS public.impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_impersonation_active
    ON public.impersonation_sessions (super_admin_id, is_active)
    WHERE is_active = TRUE;

ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_impersonation_super_admin ON public.impersonation_sessions
    FOR SELECT USING (
        (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = TRUE
    );

CREATE POLICY manage_impersonation_super_admin ON public.impersonation_sessions
    FOR ALL USING (
        (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = TRUE
    );
