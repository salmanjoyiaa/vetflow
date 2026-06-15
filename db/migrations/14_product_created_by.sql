-- Track who created catalog products (reception ownership for edit/delete).
ALTER TABLE public.products
  ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id);

COMMENT ON COLUMN public.products.created_by IS 'User who created the product; used for receptionist edit/delete ownership.';
