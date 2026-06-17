-- Retail vs clinical invoice discriminator for POS counter sales reporting.

ALTER TABLE public.invoices
  ADD COLUMN IF NOT EXISTS sale_type VARCHAR(20) NOT NULL DEFAULT 'clinical'
  CHECK (sale_type IN ('clinical', 'retail'));

CREATE INDEX IF NOT EXISTS idx_invoices_sale_type
  ON public.invoices (branch_id, sale_type, created_at DESC);

UPDATE public.invoices SET sale_type = 'retail' WHERE visit_id IS NULL;
UPDATE public.invoices SET sale_type = 'clinical' WHERE visit_id IS NOT NULL;
