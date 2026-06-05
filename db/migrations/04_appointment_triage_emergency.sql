-- Additive migration: appointment intake/triage and emergency priority
-- Run manually on Supabase (SQL editor or migration tool).

ALTER TABLE public.appointments
  ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS intake_notes TEXT,
  ADD COLUMN IF NOT EXISTS customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL;

ALTER TABLE public.visits
  ADD COLUMN IF NOT EXISTS is_emergency BOOLEAN NOT NULL DEFAULT false,
  ADD COLUMN IF NOT EXISTS triage_notes TEXT;

COMMENT ON COLUMN public.appointments.is_emergency IS 'When true, visit inherits priority at check-in';
COMMENT ON COLUMN public.appointments.intake_notes IS 'Receptionist intake/triage captured at booking';
COMMENT ON COLUMN public.appointments.customer_id IS 'Linked customer for staff-created appointments';
COMMENT ON COLUMN public.visits.is_emergency IS 'Emergency visits sort first on doctor queue';
COMMENT ON COLUMN public.visits.triage_notes IS 'Intake/triage notes from reception or appointment check-in';
