-- Clinical visit types, surgery fields, treats product type, partial payment support

-- Visit type on clinical notes
ALTER TABLE public.clinical_notes
    ADD COLUMN IF NOT EXISTS visit_type VARCHAR(20) DEFAULT 'standard',
    ADD COLUMN IF NOT EXISTS procedure_notes TEXT,
    ADD COLUMN IF NOT EXISTS post_op_medication TEXT;

-- Extend products.type to include treats (drop and recreate check if needed)
-- Postgres: alter check constraint on products.type
DO $$
BEGIN
  IF EXISTS (
    SELECT 1 FROM information_schema.columns
    WHERE table_schema = 'public' AND table_name = 'products' AND column_name = 'type'
  ) THEN
    ALTER TABLE public.products DROP CONSTRAINT IF EXISTS products_type_check;
    ALTER TABLE public.products ADD CONSTRAINT products_type_check
      CHECK (type IN ('medicine', 'food', 'accessory', 'service', 'treats'));
  END IF;
END $$;
