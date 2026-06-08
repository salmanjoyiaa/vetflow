-- AI assistant & social automation: social post drafts + enable for demo org

CREATE TABLE public.social_posts (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram', 'twitter', 'generic')),
    content TEXT NOT NULL,
    status VARCHAR(20) NOT NULL DEFAULT 'draft' CHECK (status IN ('draft', 'scheduled', 'published')),
    scheduled_at TIMESTAMP WITH TIME ZONE,
    created_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_social_posts_updated_at
    BEFORE UPDATE ON public.social_posts
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_social_posts_org_branch ON public.social_posts (organization_id, branch_id);

ALTER TABLE public.social_posts ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_social_post ON public.social_posts
    FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
    );

CREATE POLICY manage_social_post ON public.social_posts
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
        AND public.has_org_role(organization_id, ARRAY['clinic_admin'])
    );

-- Enable enterprise features for VetCare demo org (subscription JSONB)
UPDATE public.subscription_status
SET features = features || '{"ai_assistant":true,"social_automation":true}'::jsonb
WHERE organization_id = 'a0000000-0000-0000-0000-000000000000';
