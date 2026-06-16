-- Consult pause tracking + user profile avatar

ALTER TABLE public.visits
    ADD COLUMN IF NOT EXISTS consult_paused_at TIMESTAMP WITH TIME ZONE,
    ADD COLUMN IF NOT EXISTS consult_pause_reason TEXT,
    ADD COLUMN IF NOT EXISTS consult_pause_accumulated_sec INTEGER NOT NULL DEFAULT 0;

ALTER TABLE public.user_profiles
    ADD COLUMN IF NOT EXISTS avatar_url TEXT;

COMMENT ON COLUMN public.visits.consult_paused_at IS 'When non-null, consult timer is frozen and reception sees paused state';
COMMENT ON COLUMN public.visits.consult_pause_reason IS 'Doctor-provided reason shown to reception and clinic admin';
COMMENT ON COLUMN public.user_profiles.avatar_url IS 'Storage path in clinic-documents bucket for profile photo';
