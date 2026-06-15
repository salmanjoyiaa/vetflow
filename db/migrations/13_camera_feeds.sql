-- Camera devices and recording metadata (MVP snapshot-based feeds)

CREATE TABLE IF NOT EXISTS public.camera_devices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    stream_url TEXT,
    snapshot_url TEXT,
    storage_bucket_path TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_camera_devices_updated_at
    BEFORE UPDATE ON public.camera_devices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX IF NOT EXISTS idx_camera_devices_branch ON public.camera_devices (branch_id);

CREATE TABLE IF NOT EXISTS public.camera_recordings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    device_id UUID NOT NULL REFERENCES public.camera_devices(id) ON DELETE CASCADE,
    started_at TIMESTAMP WITH TIME ZONE NOT NULL,
    ended_at TIMESTAMP WITH TIME ZONE,
    storage_path TEXT NOT NULL,
    thumbnail_path TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX IF NOT EXISTS idx_camera_recordings_device ON public.camera_recordings (device_id);

ALTER TABLE public.camera_devices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.camera_recordings ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_camera_device ON public.camera_devices
    FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
    );

CREATE POLICY manage_camera_device ON public.camera_devices
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND public.has_org_role(organization_id, ARRAY['clinic_admin'])
    );

CREATE POLICY select_camera_recording ON public.camera_recordings
    FOR SELECT USING (
        device_id IN (
            SELECT id FROM public.camera_devices
            WHERE organization_id IN (SELECT public.get_user_organizations())
        )
    );

CREATE POLICY manage_camera_recording ON public.camera_recordings
    FOR ALL USING (
        device_id IN (
            SELECT id FROM public.camera_devices
            WHERE organization_id IN (SELECT public.get_user_organizations())
            AND public.has_org_role(organization_id, ARRAY['clinic_admin'])
        )
    );
