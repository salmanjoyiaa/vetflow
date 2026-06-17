-- Prevent duplicate visits for the same appointment check-in.
CREATE UNIQUE INDEX IF NOT EXISTS idx_visits_appointment_unique
    ON public.visits (appointment_id)
    WHERE appointment_id IS NOT NULL;
