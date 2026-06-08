-- ====================================================================
-- ClinixDev Database Schema (01_init.sql)
-- Consolidated, clean schema for the multi-clinic-type platform.
-- MVP targets veterinary clinics; the model is generic (patients) so it
-- can support dental / general / specialty clinics over time.
--
-- Contents: extensions, tables, indexes, RLS helpers, triggers, RLS
-- policies, secure public-booking RPC, and Storage bucket policies.
-- ====================================================================

-- ====================================================================
-- 1. EXTENSIONS AND SHARED TRIGGERS
-- ====================================================================
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";
CREATE EXTENSION IF NOT EXISTS pgcrypto;

CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- ====================================================================
-- 2. PLATFORM TAXONOMY: CLINIC TYPES AND PLANS
-- ====================================================================
CREATE TABLE public.clinic_types (
    id VARCHAR(50) PRIMARY KEY,            -- vet, dental, general, specialty
    label VARCHAR(255) NOT NULL,
    description TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.clinic_types (id, label, description, is_active) VALUES
('vet', 'Veterinary Clinic', 'Animal hospitals and veterinary practices', TRUE),
('dental', 'Dental Clinic', 'Dental practices (planned)', FALSE),
('general', 'General Clinic', 'General human outpatient clinics (planned)', FALSE),
('specialty', 'Specialty Clinic', 'Specialty practices (planned)', FALSE)
ON CONFLICT (id) DO NOTHING;

CREATE TABLE public.plans (
    id VARCHAR(50) PRIMARY KEY,            -- trial, starter, pro, enterprise
    name VARCHAR(255) NOT NULL,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    currency VARCHAR(10) NOT NULL DEFAULT 'USD',
    billing_interval VARCHAR(20) NOT NULL DEFAULT 'month', -- month, year
    default_features JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

INSERT INTO public.plans (id, name, price, billing_interval, default_features) VALUES
('trial', 'Trial', 0.00, 'month', '{"appointments":true,"inventory":true,"sales":true,"reports":true,"multi_branch":false,"ai_assistant":false,"social_automation":false}'::jsonb),
('starter', 'Starter', 29.00, 'month', '{"appointments":true,"inventory":true,"sales":true,"reports":false,"multi_branch":false,"ai_assistant":false,"social_automation":false}'::jsonb),
('pro', 'Pro', 79.00, 'month', '{"appointments":true,"inventory":true,"sales":true,"reports":true,"multi_branch":true,"ai_assistant":false,"social_automation":false}'::jsonb),
('enterprise', 'Enterprise', 199.00, 'month', '{"appointments":true,"inventory":true,"sales":true,"reports":true,"multi_branch":true,"ai_assistant":true,"social_automation":true}'::jsonb)
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 3. ORGANIZATIONS (TENANTS)
-- ====================================================================
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    clinic_type_id VARCHAR(50) NOT NULL DEFAULT 'vet' REFERENCES public.clinic_types(id),
    accepts_public_booking BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 4. SUBSCRIPTION STATUS
-- ====================================================================
CREATE TABLE public.subscription_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_id VARCHAR(50) REFERENCES public.plans(id),
    plan_name VARCHAR(50) NOT NULL DEFAULT 'trial',
    status VARCHAR(50) NOT NULL DEFAULT 'trial', -- active, trial, suspended, cancelled
    trial_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
    renewal_date TIMESTAMP WITH TIME ZONE,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id)
);

CREATE TRIGGER update_subscription_status_updated_at
    BEFORE UPDATE ON public.subscription_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 5. FEATURE FLAGS (platform-wide and per-organization overrides)
--    scope='platform'  -> organization_id IS NULL (global default)
--    scope='organization' -> organization_id set (override)
--    Example key: 'branded_pdfs' (superadmin-controlled gate)
-- ====================================================================
CREATE TABLE public.feature_flags (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    key VARCHAR(100) NOT NULL,
    scope VARCHAR(20) NOT NULL DEFAULT 'platform', -- platform | organization
    organization_id UUID REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    description TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(key, organization_id)
);

CREATE TRIGGER update_feature_flags_updated_at
    BEFORE UPDATE ON public.feature_flags
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Platform default: branded PDFs OFF until superadmin enables per clinic.
INSERT INTO public.feature_flags (key, scope, organization_id, is_enabled, description) VALUES
('branded_pdfs', 'platform', NULL, FALSE, 'Allow clinics to render branded (logo/address/colors) PDFs')
ON CONFLICT (key, organization_id) DO NOTHING;

-- ====================================================================
-- 6. BRANCHES
-- ====================================================================
CREATE TABLE public.branches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    address TEXT,
    phone VARCHAR(50),
    email VARCHAR(255),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_branches_updated_at
    BEFORE UPDATE ON public.branches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 7. ROLES
-- ====================================================================
CREATE TABLE public.roles (
    id VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT INTO public.roles (id, description) VALUES
('super_admin', 'ClinixDev Platform Super Admin'),
('clinic_admin', 'Clinic Owner / Business Administrator'),
('doctor', 'Practitioner / Medical Staff'),
('receptionist', 'Front Desk / Operations Staff')
ON CONFLICT (id) DO NOTHING;

-- ====================================================================
-- 8. USER PROFILES
-- ====================================================================
CREATE TABLE public.user_profiles (
    id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
    first_name VARCHAR(255),
    last_name VARCHAR(255),
    phone VARCHAR(50),
    is_super_admin BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_user_profiles_updated_at
    BEFORE UPDATE ON public.user_profiles
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 9. ORGANIZATION MEMBERS
-- ====================================================================
CREATE TABLE public.organization_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    role VARCHAR(50) NOT NULL REFERENCES public.roles(id),
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, user_id)
);

CREATE TRIGGER update_organization_members_updated_at
    BEFORE UPDATE ON public.organization_members
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 10. BRANCH MEMBERS
-- ====================================================================
CREATE TABLE public.branch_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(branch_id, user_id)
);

-- ====================================================================
-- 11. CUSTOMERS (pet owners / patient guardians)
-- ====================================================================
CREATE TABLE public.customers (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    first_name VARCHAR(255) NOT NULL,
    last_name VARCHAR(255) NOT NULL,
    email VARCHAR(255),
    phone VARCHAR(50) NOT NULL,
    address TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    created_by UUID REFERENCES public.user_profiles(id),
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_customers_updated_at
    BEFORE UPDATE ON public.customers
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 12. PATIENTS (generic model; vet MVP uses patient_type = 'pet')
--     metadata JSONB carries clinic-type-specific data. For vet:
--     species, breed, color, microchip_number, allergies, notes.
-- ====================================================================
CREATE TABLE public.patients (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    patient_number VARCHAR(50),
    patient_type VARCHAR(20) NOT NULL DEFAULT 'pet', -- pet | human
    name VARCHAR(255) NOT NULL,
    species VARCHAR(100),
    breed VARCHAR(100),
    color VARCHAR(100),
    gender VARCHAR(20),
    date_of_birth DATE,
    weight_kg DECIMAL(6, 2),
    microchip_number VARCHAR(100),
    allergies TEXT,
    medical_notes TEXT,
    metadata JSONB NOT NULL DEFAULT '{}'::jsonb,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE,
    UNIQUE(organization_id, patient_number)
);

CREATE TRIGGER update_patients_updated_at
    BEFORE UPDATE ON public.patients
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- Auto-generate a per-organization patient number (P-YYYY-00001).
CREATE OR REPLACE FUNCTION public.generate_patient_number()
RETURNS TRIGGER AS $$
DECLARE
    next_seq INT;
BEGIN
    IF NEW.patient_number IS NOT NULL AND NEW.patient_number <> '' THEN
        RETURN NEW;
    END IF;
    -- Serialize numbering per organization to avoid collisions.
    PERFORM pg_advisory_xact_lock(hashtext(NEW.organization_id::text));
    SELECT COUNT(*) + 1 INTO next_seq
    FROM public.patients
    WHERE organization_id = NEW.organization_id;
    NEW.patient_number := 'P-' || to_char(timezone('utc'::text, now()), 'YYYY') || '-' || lpad(next_seq::text, 5, '0');
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

CREATE TRIGGER set_patient_number
    BEFORE INSERT ON public.patients
    FOR EACH ROW EXECUTE FUNCTION public.generate_patient_number();

-- ====================================================================
-- 13. APPOINTMENTS
-- ====================================================================
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    patient_name VARCHAR(255) NOT NULL,
    patient_species VARCHAR(100),
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'requested', -- requested, confirmed, checked_in, completed, cancelled, no_show, rescheduled
    doctor_id UUID REFERENCES public.user_profiles(id),
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    intake_notes TEXT,
    source VARCHAR(50) NOT NULL DEFAULT 'staff', -- staff | public
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 14. VISITS
-- ====================================================================
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    doctor_id UUID REFERENCES public.user_profiles(id),
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- waiting, consulting, ready_for_checkout, completed, cancelled
    is_emergency BOOLEAN NOT NULL DEFAULT FALSE,
    triage_notes TEXT,
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_visits_updated_at
    BEFORE UPDATE ON public.visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 15. VISIT ASSIGNMENTS (manual receptionist -> doctor assignment)
-- ====================================================================
CREATE TABLE public.visit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(visit_id)
);

-- ====================================================================
-- 16. CLINICAL NOTES (with vitals)
-- ====================================================================
CREATE TABLE public.clinical_notes (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    chief_complaint TEXT NOT NULL,
    history TEXT,
    examination_findings TEXT,
    diagnosis TEXT NOT NULL,
    treatment_plan TEXT,
    internal_notes TEXT,
    follow_up_recommendation TEXT,
    temperature_c NUMERIC(5, 2),
    heart_rate_bpm INTEGER,
    respiratory_rate INTEGER,
    weight_kg NUMERIC(6, 2),
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_clinical_notes_updated_at
    BEFORE UPDATE ON public.clinical_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 17. PRESCRIPTIONS + REVISIONS + ITEMS
-- ====================================================================
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.user_profiles(id),
    revision_number INT NOT NULL DEFAULT 1,
    notes TEXT,
    is_finalized BOOLEAN NOT NULL DEFAULT FALSE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_prescriptions_updated_at
    BEFORE UPDATE ON public.prescriptions
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.prescription_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.user_profiles(id),
    old_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name)
);

CREATE TABLE public.products (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    category_id UUID REFERENCES public.product_categories(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    brand VARCHAR(255),
    sku VARCHAR(100),
    unit VARCHAR(50) NOT NULL DEFAULT 'pcs',
    type VARCHAR(50) NOT NULL, -- medicine, food, accessory, service
    purchase_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    selling_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    stock_quantity INT NOT NULL DEFAULT 0,
    reorder_level INT NOT NULL DEFAULT 5,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_products_updated_at
    BEFORE UPDATE ON public.products
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.inventory_batches (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_number VARCHAR(100) NOT NULL,
    quantity INT NOT NULL,
    expiry_date DATE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_inventory_batches_updated_at
    BEFORE UPDATE ON public.inventory_batches
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- purchase_added, invoice_sale, manual_adjustment, expired_removed, return, consultation_use
    quantity INT NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.prescription_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    medicine_name VARCHAR(255) NOT NULL,
    dosage VARCHAR(100) NOT NULL,
    frequency VARCHAR(100) NOT NULL,
    duration VARCHAR(100) NOT NULL,
    instructions TEXT,
    quantity_requested INT NOT NULL DEFAULT 1
);

-- ====================================================================
-- 18. LAB TESTS (catalog) + LAB ORDERS (per visit)
-- ====================================================================
CREATE TABLE public.lab_tests (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_lab_tests_updated_at
    BEFORE UPDATE ON public.lab_tests
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.lab_orders (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    patient_id UUID NOT NULL REFERENCES public.patients(id) ON DELETE CASCADE,
    lab_test_id UUID REFERENCES public.lab_tests(id) ON DELETE SET NULL,
    test_name VARCHAR(255) NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'ordered', -- ordered, in_progress, completed, cancelled
    result_text TEXT,
    result_document_id UUID, -- FK added after documents table is created
    ordered_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_lab_orders_updated_at
    BEFORE UPDATE ON public.lab_orders
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 19. DOCUMENTS (uploaded medical documents; storage-backed)
-- ====================================================================
CREATE TABLE public.documents (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE CASCADE,
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
    uploaded_by UUID REFERENCES public.user_profiles(id),
    bucket_id VARCHAR(100) NOT NULL DEFAULT 'clinic-documents',
    storage_path TEXT NOT NULL,
    file_name VARCHAR(255) NOT NULL,
    mime_type VARCHAR(100),
    size_bytes BIGINT,
    category VARCHAR(50) NOT NULL DEFAULT 'medical', -- medical, lab_result, imaging, consent, other
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

ALTER TABLE public.lab_orders
    ADD CONSTRAINT lab_orders_result_document_fk
    FOREIGN KEY (result_document_id) REFERENCES public.documents(id) ON DELETE SET NULL;

-- ====================================================================
-- 20. TAX SETTINGS
-- ====================================================================
CREATE TABLE public.tax_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    is_enabled BOOLEAN NOT NULL DEFAULT TRUE,
    tax_name VARCHAR(50) NOT NULL DEFAULT 'VAT',
    tax_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    applies_to_products BOOLEAN NOT NULL DEFAULT TRUE,
    applies_to_services BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id)
);

CREATE TRIGGER update_tax_settings_updated_at
    BEFORE UPDATE ON public.tax_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 21. INVOICES + ITEMS + ADJUSTMENTS + PAYMENTS
-- ====================================================================
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    patient_id UUID REFERENCES public.patients(id) ON DELETE SET NULL,
    visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL,
    subtotal DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    discount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_percentage DECIMAL(5, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_status VARCHAR(50) NOT NULL DEFAULT 'unpaid', -- unpaid, paid, voided, partially_paid
    notes TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    paid_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_invoices_updated_at
    BEFORE UPDATE ON public.invoices
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE TABLE public.invoice_items (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    product_id UUID REFERENCES public.products(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    quantity INT NOT NULL DEFAULT 1,
    unit_price DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    tax_amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    total DECIMAL(12, 2) NOT NULL DEFAULT 0.00
);

CREATE TABLE public.invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    adjusted_by UUID NOT NULL REFERENCES public.user_profiles(id),
    reason TEXT NOT NULL,
    before_data JSONB NOT NULL,
    after_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TABLE public.payments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    amount DECIMAL(12, 2) NOT NULL DEFAULT 0.00,
    payment_method VARCHAR(50) NOT NULL, -- cash, card, bank_transfer
    reference_number VARCHAR(100),
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 22. EMAIL TEMPLATES
-- ====================================================================
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- appointment_request, appointment_confirmed, invoice_delivery, prescription_delivery, payment_thank_you
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, type)
);

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 23. APP SETTINGS (clinic branding, address, PDF branding)
-- ====================================================================
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    clinic_logo_url TEXT,
    clinic_address TEXT,
    clinic_phone VARCHAR(50),
    clinic_email VARCHAR(255),
    timezone VARCHAR(100) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    opening_hours JSONB,
    pdf_branding_enabled BOOLEAN NOT NULL DEFAULT FALSE,
    pdf_accent_color VARCHAR(20) DEFAULT '#0b132b',
    pdf_footer_text TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id)
);

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- ====================================================================
-- 24. AUDIT LOGS (HIPAA-ready: actor, ip, ua, before/after, category)
-- ====================================================================
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    category VARCHAR(50) NOT NULL DEFAULT 'data', -- data, access, security, billing
    severity VARCHAR(20) NOT NULL DEFAULT 'info',  -- info, warning, critical
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 25. IMPERSONATION SESSIONS (audited superadmin tenant access)
-- ====================================================================
CREATE TABLE public.impersonation_sessions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    super_admin_id UUID NOT NULL REFERENCES auth.users(id) ON DELETE CASCADE,
    target_organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
    ended_at TIMESTAMPTZ,
    reason TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE
);

CREATE INDEX IF NOT EXISTS idx_impersonation_active
    ON public.impersonation_sessions (super_admin_id, is_active)
    WHERE is_active = TRUE;

-- ====================================================================
-- 26. INDEXES (hot paths)
-- ====================================================================
CREATE INDEX idx_org_members_user ON public.organization_members (user_id) WHERE is_active = TRUE;
CREATE INDEX idx_branch_members_user ON public.branch_members (user_id);
CREATE INDEX idx_patients_org ON public.patients (organization_id);
CREATE INDEX idx_patients_customer ON public.patients (customer_id);
CREATE INDEX idx_appointments_org_branch ON public.appointments (organization_id, branch_id);
CREATE INDEX idx_visits_org_branch ON public.visits (organization_id, branch_id);
CREATE INDEX idx_visits_doctor ON public.visits (doctor_id);
CREATE INDEX idx_documents_patient ON public.documents (patient_id);
CREATE INDEX idx_documents_visit ON public.documents (visit_id);
CREATE INDEX idx_lab_orders_visit ON public.lab_orders (visit_id);
CREATE INDEX idx_invoices_org_branch ON public.invoices (organization_id, branch_id);
CREATE INDEX idx_audit_logs_org ON public.audit_logs (organization_id, created_at DESC);

-- ====================================================================
-- 27. AUTH PROFILE TRIGGER
-- ====================================================================
CREATE OR REPLACE FUNCTION public.handle_new_user()
RETURNS TRIGGER AS $$
BEGIN
    INSERT INTO public.user_profiles (id, first_name, last_name, phone, is_super_admin)
    VALUES (
        NEW.id,
        COALESCE(NEW.raw_user_meta_data->>'first_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'last_name', ''),
        COALESCE(NEW.raw_user_meta_data->>'phone', ''),
        COALESCE((NEW.raw_user_meta_data->>'is_super_admin')::boolean, FALSE)
    );
    RETURN NEW;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE TRIGGER on_auth_user_created
    AFTER INSERT ON auth.users
    FOR EACH ROW EXECUTE FUNCTION public.handle_new_user();

-- ====================================================================
-- 28. RLS HELPERS
-- ====================================================================
CREATE OR REPLACE FUNCTION public.is_super_admin()
RETURNS BOOLEAN AS $$
    SELECT COALESCE((SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()), FALSE);
$$ LANGUAGE sql STABLE SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE (organization_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT om.organization_id
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.get_user_branches()
RETURNS TABLE (branch_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT bm.branch_id
    FROM public.branch_members bm
    WHERE bm.user_id = auth.uid()
    UNION
    SELECT b.id
    FROM public.branches b
    JOIN public.organization_members om ON om.organization_id = b.organization_id
    WHERE om.user_id = auth.uid() AND om.is_active = TRUE AND om.role = 'clinic_admin';
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

CREATE OR REPLACE FUNCTION public.has_org_role(target_org UUID, target_roles TEXT[])
RETURNS BOOLEAN AS $$
    SELECT EXISTS (
        SELECT 1 FROM public.organization_members om
        WHERE om.user_id = auth.uid()
          AND om.organization_id = target_org
          AND om.is_active = TRUE
          AND om.role = ANY(target_roles)
    );
$$ LANGUAGE sql STABLE SECURITY DEFINER;

-- ====================================================================
-- 29. SECURE PUBLIC APPOINTMENT BOOKING RPC
--     Public clients never insert directly into appointments. This
--     SECURITY DEFINER function validates the clinic by slug, confirms
--     it accepts public booking, and inserts a scoped 'requested' row.
-- ====================================================================
CREATE OR REPLACE FUNCTION public.submit_public_appointment(
    p_clinic_slug TEXT,
    p_branch_id UUID,
    p_customer_name TEXT,
    p_customer_email TEXT,
    p_customer_phone TEXT,
    p_patient_name TEXT,
    p_patient_species TEXT,
    p_preferred_date DATE,
    p_preferred_time TIME,
    p_reason TEXT
)
RETURNS UUID AS $$
DECLARE
    v_org public.organizations%ROWTYPE;
    v_branch_id UUID;
    v_appointment_id UUID;
BEGIN
    -- Basic server-side validation (defense in depth alongside app-layer zod).
    IF p_customer_name IS NULL OR length(trim(p_customer_name)) = 0
       OR p_customer_phone IS NULL OR length(trim(p_customer_phone)) = 0
       OR p_patient_name IS NULL OR length(trim(p_patient_name)) = 0
       OR p_reason IS NULL OR length(trim(p_reason)) = 0
       OR p_preferred_date IS NULL OR p_preferred_time IS NULL THEN
        RAISE EXCEPTION 'Invalid appointment payload';
    END IF;

    IF p_preferred_date < CURRENT_DATE THEN
        RAISE EXCEPTION 'Preferred date cannot be in the past';
    END IF;

    -- Resolve the org strictly by slug; the client can never inject org_id.
    SELECT * INTO v_org
    FROM public.organizations
    WHERE slug = p_clinic_slug AND deleted_at IS NULL;

    IF NOT FOUND OR NOT v_org.accepts_public_booking THEN
        RAISE EXCEPTION 'Clinic not found or not accepting public bookings';
    END IF;

    -- If a branch is supplied, it MUST belong to the resolved org and be active;
    -- otherwise fall back to the clinic's first active branch. This prevents a
    -- client from attaching the request to an arbitrary branch/org.
    IF p_branch_id IS NOT NULL THEN
        SELECT id INTO v_branch_id
        FROM public.branches
        WHERE id = p_branch_id AND organization_id = v_org.id AND is_active = TRUE;
    END IF;

    IF v_branch_id IS NULL THEN
        SELECT id INTO v_branch_id
        FROM public.branches
        WHERE organization_id = v_org.id AND is_active = TRUE
        ORDER BY created_at ASC
        LIMIT 1;
    END IF;

    IF v_branch_id IS NULL THEN
        RAISE EXCEPTION 'Clinic has no active branch';
    END IF;

    INSERT INTO public.appointments (
        organization_id, branch_id, customer_name, customer_email, customer_phone,
        patient_name, patient_species, preferred_date, preferred_time, reason,
        status, source
    ) VALUES (
        v_org.id, v_branch_id, trim(p_customer_name), trim(p_customer_email), trim(p_customer_phone),
        trim(p_patient_name), NULLIF(trim(p_patient_species), ''), p_preferred_date, p_preferred_time, trim(p_reason),
        'requested', 'public'
    )
    RETURNING id INTO v_appointment_id;

    RETURN v_appointment_id;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

REVOKE ALL ON FUNCTION public.submit_public_appointment(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TIME, TEXT) FROM PUBLIC;
GRANT EXECUTE ON FUNCTION public.submit_public_appointment(TEXT, UUID, TEXT, TEXT, TEXT, TEXT, TEXT, DATE, TIME, TEXT) TO anon, authenticated;

-- ====================================================================
-- 30. ENABLE ROW LEVEL SECURITY
-- ====================================================================
ALTER TABLE public.clinic_types ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.plans ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.feature_flags ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.patients ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.appointments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visits ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_assignments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.clinical_notes ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_revisions ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.prescription_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.product_categories ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.products ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.inventory_batches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.stock_movements ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_tests ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.lab_orders ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.documents ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.impersonation_sessions ENABLE ROW LEVEL SECURITY;

-- ====================================================================
-- 31. RLS POLICIES
-- ====================================================================

-- Reference tables: readable by any authenticated user; superadmin manages.
CREATE POLICY select_clinic_types ON public.clinic_types
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY manage_clinic_types ON public.clinic_types
    FOR ALL USING (public.is_super_admin());

CREATE POLICY select_plans ON public.plans
    FOR SELECT USING (auth.role() = 'authenticated');
CREATE POLICY manage_plans ON public.plans
    FOR ALL USING (public.is_super_admin());

-- Feature flags: superadmin full control; org members can read their own + platform.
CREATE POLICY select_feature_flags ON public.feature_flags
    FOR SELECT USING (
        public.is_super_admin()
        OR scope = 'platform'
        OR organization_id IN (SELECT public.get_user_organizations())
    );
CREATE POLICY manage_feature_flags ON public.feature_flags
    FOR ALL USING (public.is_super_admin());

-- User profiles
CREATE POLICY select_user_profile ON public.user_profiles
    FOR SELECT USING (id = auth.uid() OR public.is_super_admin());
CREATE POLICY update_user_profile ON public.user_profiles
    FOR UPDATE USING (id = auth.uid());

-- Organizations
CREATE POLICY select_organization ON public.organizations
    FOR SELECT USING (id IN (SELECT public.get_user_organizations()) OR public.is_super_admin());
CREATE POLICY manage_organization ON public.organizations
    FOR ALL USING (public.is_super_admin());
CREATE POLICY update_organization ON public.organizations
    FOR UPDATE USING (public.has_org_role(id, ARRAY['clinic_admin']));

-- Subscription status
CREATE POLICY select_subscription ON public.subscription_status
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) OR public.is_super_admin());
CREATE POLICY manage_subscription ON public.subscription_status
    FOR ALL USING (public.is_super_admin());

-- Branches
CREATE POLICY select_branch ON public.branches
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) OR public.is_super_admin());
CREATE POLICY manage_branch ON public.branches
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin']) OR public.is_super_admin());

-- Organization members
CREATE POLICY select_org_member ON public.organization_members
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) OR public.is_super_admin());
CREATE POLICY manage_org_member ON public.organization_members
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin']) OR public.is_super_admin());

-- Branch members
CREATE POLICY select_branch_member ON public.branch_members
    FOR SELECT USING (branch_id IN (SELECT public.get_user_branches()) OR public.is_super_admin());
CREATE POLICY manage_branch_member ON public.branch_members
    FOR ALL USING (
        public.is_super_admin()
        OR branch_id IN (
            SELECT b.id FROM public.branches b
            WHERE public.has_org_role(b.organization_id, ARRAY['clinic_admin'])
        )
    );

-- Customers
CREATE POLICY select_customer ON public.customers
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));
CREATE POLICY manage_customer ON public.customers
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

-- Patients
CREATE POLICY select_patient ON public.patients
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_patient ON public.patients
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()));

-- Appointments (no public INSERT policy; public booking via RPC only)
CREATE POLICY select_appointment ON public.appointments
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_appointment ON public.appointments
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()));

-- Visits
CREATE POLICY select_visit ON public.visits
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));
CREATE POLICY manage_visit ON public.visits
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

-- Visit assignments
CREATE POLICY select_visit_assignment ON public.visit_assignments
    FOR SELECT USING (visit_id IN (SELECT id FROM public.visits WHERE organization_id IN (SELECT public.get_user_organizations())));
CREATE POLICY manage_visit_assignment ON public.visit_assignments
    FOR ALL USING (visit_id IN (SELECT id FROM public.visits WHERE organization_id IN (SELECT public.get_user_organizations())));

-- Clinical notes
CREATE POLICY select_clinical_note ON public.clinical_notes
    FOR SELECT USING (visit_id IN (SELECT id FROM public.visits WHERE organization_id IN (SELECT public.get_user_organizations())));
CREATE POLICY manage_clinical_note ON public.clinical_notes
    FOR ALL USING (
        visit_id IN (SELECT id FROM public.visits WHERE organization_id IN (SELECT public.get_user_organizations()))
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('doctor', 'clinic_admin'))
    );

-- Prescriptions
CREATE POLICY select_prescription ON public.prescriptions
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));
CREATE POLICY manage_prescription ON public.prescriptions
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('doctor', 'clinic_admin'))
    );

CREATE POLICY select_prescription_revision ON public.prescription_revisions
    FOR SELECT USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));
CREATE POLICY manage_prescription_revision ON public.prescription_revisions
    FOR ALL USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY select_prescription_item ON public.prescription_items
    FOR SELECT USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));
CREATE POLICY manage_prescription_item ON public.prescription_items
    FOR ALL USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));

-- Products & categories
CREATE POLICY select_product ON public.products
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_product ON public.products
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin']));

CREATE POLICY select_product_category ON public.product_categories
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_product_category ON public.product_categories
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin']));

-- Inventory batches & stock movements
CREATE POLICY select_inventory_batch ON public.inventory_batches
    FOR SELECT USING (product_id IN (SELECT id FROM public.products WHERE organization_id IN (SELECT public.get_user_organizations())));
CREATE POLICY manage_inventory_batch ON public.inventory_batches
    FOR ALL USING (product_id IN (SELECT id FROM public.products WHERE public.has_org_role(organization_id, ARRAY['clinic_admin'])));

CREATE POLICY select_stock_movement ON public.stock_movements
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));
CREATE POLICY manage_stock_movement ON public.stock_movements
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

-- Lab tests & lab orders
CREATE POLICY select_lab_test ON public.lab_tests
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_lab_test ON public.lab_tests
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin', 'doctor']));

CREATE POLICY select_lab_order ON public.lab_orders
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));
CREATE POLICY manage_lab_order ON public.lab_orders
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('doctor', 'clinic_admin'))
    );

-- Documents
CREATE POLICY select_document ON public.documents
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_document ON public.documents
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('doctor', 'clinic_admin', 'receptionist'))
    );

-- Tax settings
CREATE POLICY select_tax_setting ON public.tax_settings
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_tax_setting ON public.tax_settings
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin']));

-- Invoices, items, adjustments, payments
CREATE POLICY select_invoice ON public.invoices
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));
CREATE POLICY manage_invoice ON public.invoices
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('clinic_admin', 'receptionist'))
    );

CREATE POLICY select_invoice_item ON public.invoice_items
    FOR SELECT USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));
CREATE POLICY manage_invoice_item ON public.invoice_items
    FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY select_invoice_adjustment ON public.invoice_adjustments
    FOR SELECT USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));
CREATE POLICY manage_invoice_adjustment ON public.invoice_adjustments
    FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY select_payment ON public.payments
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));
CREATE POLICY manage_payment ON public.payments
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND branch_id IN (SELECT public.get_user_branches())
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('clinic_admin', 'receptionist'))
    );

-- Email & app settings
CREATE POLICY select_email_template ON public.email_templates
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_email_template ON public.email_templates
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin']));

CREATE POLICY select_app_setting ON public.app_settings
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));
CREATE POLICY manage_app_setting ON public.app_settings
    FOR ALL USING (public.has_org_role(organization_id, ARRAY['clinic_admin']));

-- Audit logs: read for clinic admins (own org) and superadmins.
-- NO INSERT policy: writes are server-side only via service role (audit.ts),
-- which bypasses RLS. This prevents log tampering/poisoning by clients.
CREATE POLICY select_audit_log ON public.audit_logs
    FOR SELECT USING (
        public.is_super_admin()
        OR public.has_org_role(organization_id, ARRAY['clinic_admin'])
    );

-- Impersonation sessions: superadmin only.
CREATE POLICY select_impersonation_super_admin ON public.impersonation_sessions
    FOR SELECT USING (public.is_super_admin());
CREATE POLICY manage_impersonation_super_admin ON public.impersonation_sessions
    FOR ALL USING (public.is_super_admin());

-- ====================================================================
-- 32. STORAGE BUCKETS + storage.objects POLICIES
--     Private buckets. Object path convention: <organization_id>/<...>.
--     Access is scoped by matching the first path segment to a user's
--     organization membership. Downloads in-app go through an audited
--     server route using the service role.
-- ====================================================================
INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-documents', 'clinic-documents', FALSE)
ON CONFLICT (id) DO NOTHING;

INSERT INTO storage.buckets (id, name, public)
VALUES ('clinic-logos', 'clinic-logos', FALSE)
ON CONFLICT (id) DO NOTHING;

-- clinic-documents: members of the owning org (by path prefix) may read.
CREATE POLICY "clinic_documents_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'clinic-documents'
        AND (
            public.is_super_admin()
            OR (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_organizations())
        )
    );

CREATE POLICY "clinic_documents_insert" ON storage.objects
    FOR INSERT WITH CHECK (
        bucket_id = 'clinic-documents'
        AND (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_organizations())
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('doctor', 'clinic_admin', 'receptionist'))
    );

CREATE POLICY "clinic_documents_delete" ON storage.objects
    FOR DELETE USING (
        bucket_id = 'clinic-documents'
        AND (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_organizations())
        AND auth.uid() IN (SELECT user_id FROM public.organization_members WHERE role IN ('doctor', 'clinic_admin'))
    );

-- clinic-logos: org members read; clinic admins write.
CREATE POLICY "clinic_logos_select" ON storage.objects
    FOR SELECT USING (
        bucket_id = 'clinic-logos'
        AND (
            public.is_super_admin()
            OR (split_part(name, '/', 1))::uuid IN (SELECT public.get_user_organizations())
        )
    );

CREATE POLICY "clinic_logos_write" ON storage.objects
    FOR ALL USING (
        bucket_id = 'clinic-logos'
        AND public.has_org_role((split_part(name, '/', 1))::uuid, ARRAY['clinic_admin'])
    )
    WITH CHECK (
        bucket_id = 'clinic-logos'
        AND public.has_org_role((split_part(name, '/', 1))::uuid, ARRAY['clinic_admin'])
    );
