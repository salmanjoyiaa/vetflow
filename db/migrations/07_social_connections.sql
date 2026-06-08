-- Meta OAuth connections (per branch) + social post publishing fields

CREATE TABLE public.social_connections (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    page_id VARCHAR(64) NOT NULL,
    page_name VARCHAR(255),
    ig_account_id VARCHAR(64),
    ig_username VARCHAR(255),
    access_token_enc TEXT NOT NULL,
    token_expires_at TIMESTAMP WITH TIME ZONE,
    connected_by UUID REFERENCES auth.users(id) ON DELETE SET NULL,
    connected_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE (branch_id, platform)
);

CREATE TRIGGER update_social_connections_updated_at
    BEFORE UPDATE ON public.social_connections
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_social_connections_org_branch ON public.social_connections (organization_id, branch_id);

ALTER TABLE public.social_connections ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_social_connection ON public.social_connections
    FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
    );

CREATE POLICY manage_social_connection ON public.social_connections
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
        AND public.has_org_role(organization_id, ARRAY['clinic_admin'])
    );

-- Short-lived OAuth page-picker state (multiple Facebook Pages)
CREATE TABLE public.social_oauth_pending (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    user_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    platform VARCHAR(20) NOT NULL CHECK (platform IN ('facebook', 'instagram')),
    user_token_enc TEXT NOT NULL,
    pages_json JSONB NOT NULL DEFAULT '[]'::jsonb,
    expires_at TIMESTAMP WITH TIME ZONE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_social_oauth_pending_user ON public.social_oauth_pending (user_id, expires_at);

ALTER TABLE public.social_oauth_pending ENABLE ROW LEVEL SECURITY;

CREATE POLICY manage_social_oauth_pending ON public.social_oauth_pending
    FOR ALL USING (user_id = auth.uid());

-- Extend social_posts for media + publish tracking
ALTER TABLE public.social_posts
    ADD COLUMN IF NOT EXISTS image_path TEXT,
    ADD COLUMN IF NOT EXISTS external_post_id TEXT,
    ADD COLUMN IF NOT EXISTS published_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS publish_error TEXT;

ALTER TABLE public.social_posts DROP CONSTRAINT IF EXISTS social_posts_status_check;
ALTER TABLE public.social_posts
    ADD CONSTRAINT social_posts_status_check
    CHECK (status IN ('draft', 'scheduled', 'published', 'failed'));

-- Public bucket so Meta Graph API can fetch image_url for Instagram publishing
INSERT INTO storage.buckets (id, name, public)
VALUES ('social-media', 'social-media', TRUE)
ON CONFLICT (id) DO UPDATE SET public = TRUE;

CREATE POLICY "social_media_select" ON storage.objects
    FOR SELECT USING (bucket_id = 'social-media');

CREATE POLICY "social_media_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'social-media'
        AND (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_organizations())
        AND public.has_org_role((split_part(name, '/', 1))::uuid, ARRAY['clinic_admin'])
    );

CREATE POLICY "social_media_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'social-media'
        AND public.has_org_role((split_part(name, '/', 1))::uuid, ARRAY['clinic_admin'])
    );
