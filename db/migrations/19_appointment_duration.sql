ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS duration_minutes INTEGER NOT NULL DEFAULT 30;

CREATE INDEX IF NOT EXISTS idx_appointments_branch_date
    ON public.appointments (branch_id, preferred_date);
