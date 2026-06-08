-- Allow receptionists to add and manage catalog products (manual entry) alongside clinic admins.

DROP POLICY IF EXISTS manage_product ON public.products;
CREATE POLICY manage_product ON public.products
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin', 'receptionist']));
