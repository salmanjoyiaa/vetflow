ALTER TABLE public.visits
    ADD COLUMN IF NOT EXISTS consult_draft JSONB;

COMMENT ON COLUMN public.visits.consult_draft IS 'In-progress SOAP form snapshot for draft resume';
