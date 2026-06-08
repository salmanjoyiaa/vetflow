-- ====================================================================
-- ClinixDev Security & Performance Hardening (02_security_perf_fixes.sql)
-- Applied after 01_init.sql to resolve Supabase advisor findings:
--   * RLS enabled on public.roles (reference table)
--   * Pin search_path on all functions (function_search_path_mutable)
--   * Revoke anon EXECUTE on internal SECURITY DEFINER helpers
--     (authenticated EXECUTE is retained: RLS policy evaluation needs it)
--   * Add covering indexes for foreign keys (unindexed_foreign_keys)
-- ====================================================================

-- 1. RLS on the roles reference table -------------------------------------
ALTER TABLE public.roles ENABLE ROW LEVEL SECURITY;
DROP POLICY IF EXISTS select_roles ON public.roles;
DROP POLICY IF EXISTS manage_roles ON public.roles;
CREATE POLICY select_roles ON public.roles
    FOR SELECT USING ((SELECT auth.role()) = 'authenticated');
CREATE POLICY manage_roles ON public.roles
    FOR ALL USING ((SELECT public.is_super_admin()));

-- 2. Pin search_path on every function (defense in depth) -----------------
ALTER FUNCTION public.update_updated_at_column() SET search_path = '';
ALTER FUNCTION public.generate_patient_number() SET search_path = '';
ALTER FUNCTION public.handle_new_user() SET search_path = '';
ALTER FUNCTION public.is_super_admin() SET search_path = '';
ALTER FUNCTION public.get_user_organizations() SET search_path = '';
ALTER FUNCTION public.get_user_branches() SET search_path = '';
ALTER FUNCTION public.has_org_role(uuid, text[]) SET search_path = '';
ALTER FUNCTION public.submit_public_appointment(text, uuid, text, text, text, text, text, date, time, text) SET search_path = '';

-- 3. Lock down internal SECURITY DEFINER helpers from anon ----------------
--    Functions grant EXECUTE to PUBLIC by default (anon inherits PUBLIC), so
--    revoke from PUBLIC and re-grant only to the roles that need it. These
--    helpers are used by RLS policy evaluation (authenticated) and by the
--    service role for admin operations. Public booking uses
--    submit_public_appointment, which intentionally stays open to anon.
REVOKE EXECUTE ON FUNCTION public.is_super_admin() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_organizations() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.get_user_branches() FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) FROM PUBLIC;
REVOKE EXECUTE ON FUNCTION public.handle_new_user() FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.is_super_admin() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_organizations() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.get_user_branches() TO authenticated, service_role;
GRANT EXECUTE ON FUNCTION public.has_org_role(uuid, text[]) TO authenticated, service_role;

-- 4. Covering indexes for foreign keys ------------------------------------
CREATE INDEX IF NOT EXISTS idx_organizations_clinic_type ON public.organizations (clinic_type_id);
CREATE INDEX IF NOT EXISTS idx_subscription_status_plan ON public.subscription_status (plan_id);
CREATE INDEX IF NOT EXISTS idx_feature_flags_org ON public.feature_flags (organization_id);
CREATE INDEX IF NOT EXISTS idx_branches_org ON public.branches (organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_org ON public.customers (organization_id);
CREATE INDEX IF NOT EXISTS idx_customers_branch ON public.customers (branch_id);
CREATE INDEX IF NOT EXISTS idx_customers_created_by ON public.customers (created_by);
CREATE INDEX IF NOT EXISTS idx_appointments_branch ON public.appointments (branch_id);
CREATE INDEX IF NOT EXISTS idx_appointments_patient ON public.appointments (patient_id);
CREATE INDEX IF NOT EXISTS idx_appointments_customer ON public.appointments (customer_id);
CREATE INDEX IF NOT EXISTS idx_appointments_doctor ON public.appointments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_visits_branch ON public.visits (branch_id);
CREATE INDEX IF NOT EXISTS idx_visits_patient ON public.visits (patient_id);
CREATE INDEX IF NOT EXISTS idx_visits_customer ON public.visits (customer_id);
CREATE INDEX IF NOT EXISTS idx_visits_appointment ON public.visits (appointment_id);
CREATE INDEX IF NOT EXISTS idx_visit_assignments_doctor ON public.visit_assignments (doctor_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_visit ON public.clinical_notes (visit_id);
CREATE INDEX IF NOT EXISTS idx_clinical_notes_created_by ON public.clinical_notes (created_by);
CREATE INDEX IF NOT EXISTS idx_prescriptions_org ON public.prescriptions (organization_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_branch ON public.prescriptions (branch_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_visit ON public.prescriptions (visit_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_patient ON public.prescriptions (patient_id);
CREATE INDEX IF NOT EXISTS idx_prescriptions_doctor ON public.prescriptions (doctor_id);
CREATE INDEX IF NOT EXISTS idx_prescription_revisions_prescription ON public.prescription_revisions (prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_revisions_changed_by ON public.prescription_revisions (changed_by);
CREATE INDEX IF NOT EXISTS idx_prescription_items_prescription ON public.prescription_items (prescription_id);
CREATE INDEX IF NOT EXISTS idx_prescription_items_product ON public.prescription_items (product_id);
CREATE INDEX IF NOT EXISTS idx_product_categories_org ON public.product_categories (organization_id);
CREATE INDEX IF NOT EXISTS idx_products_org ON public.products (organization_id);
CREATE INDEX IF NOT EXISTS idx_products_branch ON public.products (branch_id);
CREATE INDEX IF NOT EXISTS idx_products_category ON public.products (category_id);
CREATE INDEX IF NOT EXISTS idx_inventory_batches_product ON public.inventory_batches (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_org ON public.stock_movements (organization_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_branch ON public.stock_movements (branch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_product ON public.stock_movements (product_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_batch ON public.stock_movements (batch_id);
CREATE INDEX IF NOT EXISTS idx_stock_movements_created_by ON public.stock_movements (created_by);
CREATE INDEX IF NOT EXISTS idx_lab_tests_org ON public.lab_tests (organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_org ON public.lab_orders (organization_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_branch ON public.lab_orders (branch_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_patient ON public.lab_orders (patient_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_lab_test ON public.lab_orders (lab_test_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_result_document ON public.lab_orders (result_document_id);
CREATE INDEX IF NOT EXISTS idx_lab_orders_ordered_by ON public.lab_orders (ordered_by);
CREATE INDEX IF NOT EXISTS idx_documents_org ON public.documents (organization_id);
CREATE INDEX IF NOT EXISTS idx_documents_branch ON public.documents (branch_id);
CREATE INDEX IF NOT EXISTS idx_documents_uploaded_by ON public.documents (uploaded_by);
CREATE INDEX IF NOT EXISTS idx_invoices_branch ON public.invoices (branch_id);
CREATE INDEX IF NOT EXISTS idx_invoices_customer ON public.invoices (customer_id);
CREATE INDEX IF NOT EXISTS idx_invoices_patient ON public.invoices (patient_id);
CREATE INDEX IF NOT EXISTS idx_invoices_visit ON public.invoices (visit_id);
CREATE INDEX IF NOT EXISTS idx_invoices_created_by ON public.invoices (created_by);
CREATE INDEX IF NOT EXISTS idx_invoice_items_invoice ON public.invoice_items (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_items_product ON public.invoice_items (product_id);
CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_invoice ON public.invoice_adjustments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_invoice_adjustments_adjusted_by ON public.invoice_adjustments (adjusted_by);
CREATE INDEX IF NOT EXISTS idx_payments_org ON public.payments (organization_id);
CREATE INDEX IF NOT EXISTS idx_payments_branch ON public.payments (branch_id);
CREATE INDEX IF NOT EXISTS idx_payments_invoice ON public.payments (invoice_id);
CREATE INDEX IF NOT EXISTS idx_payments_created_by ON public.payments (created_by);
CREATE INDEX IF NOT EXISTS idx_audit_logs_branch ON public.audit_logs (branch_id);
CREATE INDEX IF NOT EXISTS idx_audit_logs_actor ON public.audit_logs (actor_user_id);
CREATE INDEX IF NOT EXISTS idx_impersonation_target_org ON public.impersonation_sessions (target_organization_id);
