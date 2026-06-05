-- Add structured vitals to clinical_notes (additive, safe to run on existing DB)
ALTER TABLE public.clinical_notes
  ADD COLUMN IF NOT EXISTS temperature_c NUMERIC(5, 2),
  ADD COLUMN IF NOT EXISTS heart_rate_bpm INTEGER,
  ADD COLUMN IF NOT EXISTS respiratory_rate INTEGER,
  ADD COLUMN IF NOT EXISTS weight_kg NUMERIC(6, 2);
