-- Allow clinic staff to read profiles of members in the same organization

CREATE POLICY select_org_member_profiles ON public.user_profiles
    FOR SELECT USING (
        id IN (
            SELECT om.user_id
            FROM public.organization_members om
            WHERE om.organization_id IN (SELECT public.get_user_organizations())
              AND om.is_active = true
        )
    );
