-- ====================================================================
-- VetFlow Database Migration (01_init.sql)
-- Complete schema, indexes, RLS helpers, triggers, and policies.
-- ====================================================================

-- 1. SETUP EXTENSIONS AND TRIGGERS
CREATE EXTENSION IF NOT EXISTS "uuid-ossp";

-- Trigger function to automatically update updated_at timestamp
CREATE OR REPLACE FUNCTION update_updated_at_column()
RETURNS TRIGGER AS $$
BEGIN
    NEW.updated_at = timezone('utc'::text, now());
    RETURN NEW;
END;
$$ LANGUAGE plpgsql;

-- 2. ORGANIZATIONS
CREATE TABLE public.organizations (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    name VARCHAR(255) NOT NULL,
    slug VARCHAR(255) UNIQUE NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_organizations_updated_at
    BEFORE UPDATE ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 3. SUBSCRIPTION STATUS
CREATE TABLE public.subscription_status (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    plan_name VARCHAR(50) NOT NULL DEFAULT 'trial',
    status VARCHAR(50) NOT NULL DEFAULT 'trial', -- active, trial, suspended, cancelled
    trial_start TIMESTAMP WITH TIME ZONE NOT NULL DEFAULT timezone('utc'::text, now()),
    trial_end TIMESTAMP WITH TIME ZONE NOT NULL,
    renewal_date TIMESTAMP WITH TIME ZONE,
    features JSONB NOT NULL DEFAULT '{}'::jsonb,
    notes TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_subscription_status_updated_at
    BEFORE UPDATE ON public.subscription_status
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 4. BRANCHES
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

-- 5. ROLES
CREATE TABLE public.roles (
    id VARCHAR(50) PRIMARY KEY,
    description TEXT NOT NULL
);

INSERT INTO public.roles (id, description) VALUES
('super_admin', 'VetFlow Platform Super Admin'),
('clinic_admin', 'Clinic Owner / Business Administrator'),
('doctor', 'Veterinary Practitioner / Medical Staff'),
('receptionist', 'Front Desk / Operations Staff')
ON CONFLICT (id) DO NOTHING;

-- 6. USER PROFILES
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

-- 7. ORGANIZATION MEMBERS (User roles in an organization)
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

-- 8. BRANCH MEMBERS
CREATE TABLE public.branch_members (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    user_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(branch_id, user_id)
);

-- 9. CUSTOMERS
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

-- 10. PETS
CREATE TABLE public.pets (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    species VARCHAR(100) NOT NULL,
    breed VARCHAR(100),
    gender VARCHAR(20) NOT NULL,
    date_of_birth DATE,
    weight_kg DECIMAL(6, 2),
    allergies TEXT,
    medical_notes TEXT,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    deleted_at TIMESTAMP WITH TIME ZONE
);

CREATE TRIGGER update_pets_updated_at
    BEFORE UPDATE ON public.pets
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 11. APPOINTMENTS
CREATE TABLE public.appointments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
    customer_name VARCHAR(255) NOT NULL,
    customer_email VARCHAR(255) NOT NULL,
    customer_phone VARCHAR(50) NOT NULL,
    pet_name VARCHAR(255) NOT NULL,
    pet_species VARCHAR(100),
    preferred_date DATE NOT NULL,
    preferred_time TIME NOT NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'requested', -- requested, confirmed, checked_in, completed, cancelled, no_show, rescheduled
    doctor_id UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_appointments_updated_at
    BEFORE UPDATE ON public.appointments
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 12. VISITS
CREATE TABLE public.visits (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
    customer_id UUID NOT NULL REFERENCES public.customers(id) ON DELETE CASCADE,
    appointment_id UUID REFERENCES public.appointments(id) ON DELETE SET NULL,
    reason TEXT NOT NULL,
    status VARCHAR(50) NOT NULL DEFAULT 'waiting', -- waiting, consulting, ready_for_checkout, completed, cancelled
    checked_in_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    completed_at TIMESTAMP WITH TIME ZONE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_visits_updated_at
    BEFORE UPDATE ON public.visits
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 13. VISIT ASSIGNMENTS
CREATE TABLE public.visit_assignments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    doctor_id UUID NOT NULL REFERENCES public.user_profiles(id) ON DELETE CASCADE,
    assigned_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(visit_id)
);

-- 14. CLINICAL NOTES
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
    created_by UUID NOT NULL REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_clinical_notes_updated_at
    BEFORE UPDATE ON public.clinical_notes
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 15. PRESCRIPTIONS
CREATE TABLE public.prescriptions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    pet_id UUID NOT NULL REFERENCES public.pets(id) ON DELETE CASCADE,
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

-- 16. PRESCRIPTION REVISION HISTORY
CREATE TABLE public.prescription_revisions (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    prescription_id UUID NOT NULL REFERENCES public.prescriptions(id) ON DELETE CASCADE,
    revision_number INT NOT NULL,
    changed_by UUID NOT NULL REFERENCES public.user_profiles(id),
    old_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 17. PRODUCT CATEGORIES
CREATE TABLE public.product_categories (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, name)
);

-- 18. PRODUCTS
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

-- 19. INVENTORY BATCHES (For medicines & food with expiry date)
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

-- 20. STOCK MOVEMENTS
CREATE TABLE public.stock_movements (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    product_id UUID NOT NULL REFERENCES public.products(id) ON DELETE CASCADE,
    batch_id UUID REFERENCES public.inventory_batches(id) ON DELETE SET NULL,
    type VARCHAR(50) NOT NULL, -- purchase_added, invoice_sale, manual_adjustment, expired_removed, return
    quantity INT NOT NULL,
    reason TEXT,
    created_by UUID REFERENCES public.user_profiles(id),
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 21. PRESCRIPTION ITEMS
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

-- 22. TAX SETTINGS
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

-- 23. INVOICES
CREATE TABLE public.invoices (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    branch_id UUID NOT NULL REFERENCES public.branches(id) ON DELETE CASCADE,
    invoice_number VARCHAR(100) UNIQUE NOT NULL,
    customer_id UUID REFERENCES public.customers(id) ON DELETE SET NULL,
    pet_id UUID REFERENCES public.pets(id) ON DELETE SET NULL,
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

-- 24. INVOICE ITEMS
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

-- 25. INVOICE ADJUSTMENTS
CREATE TABLE public.invoice_adjustments (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    invoice_id UUID NOT NULL REFERENCES public.invoices(id) ON DELETE CASCADE,
    adjusted_by UUID NOT NULL REFERENCES public.user_profiles(id),
    reason TEXT NOT NULL,
    before_data JSONB NOT NULL,
    after_data JSONB NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- 26. PAYMENTS
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

-- 27. EMAIL TEMPLATES
CREATE TABLE public.email_templates (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    type VARCHAR(100) NOT NULL, -- appointment_request, appointment_confirmed, invoice_delivery, prescription_delivery
    subject VARCHAR(255) NOT NULL,
    body_html TEXT NOT NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id, type)
);

CREATE TRIGGER update_email_templates_updated_at
    BEFORE UPDATE ON public.email_templates
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 28. APP SETTINGS
CREATE TABLE public.app_settings (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    clinic_logo_url TEXT,
    timezone VARCHAR(100) DEFAULT 'UTC',
    currency VARCHAR(10) DEFAULT 'USD',
    opening_hours JSONB,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    UNIQUE(organization_id)
);

CREATE TRIGGER update_app_settings_updated_at
    BEFORE UPDATE ON public.app_settings
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

-- 29. AUDIT LOGS
CREATE TABLE public.audit_logs (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID REFERENCES public.organizations(id) ON DELETE SET NULL,
    branch_id UUID REFERENCES public.branches(id) ON DELETE SET NULL,
    actor_user_id UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    actor_role VARCHAR(50),
    action VARCHAR(100) NOT NULL,
    resource_type VARCHAR(100) NOT NULL,
    resource_id UUID,
    before_data JSONB,
    after_data JSONB,
    ip_address VARCHAR(45),
    user_agent TEXT,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

-- ====================================================================
-- 30. AUTOMATIC PROFILE TRIGGER FROM AUTH.USERS
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
-- 31. ROW-LEVEL SECURITY HELPERS AND POLICIES
-- ====================================================================

-- Security helper to fetch user's active organizations
CREATE OR REPLACE FUNCTION public.get_user_organizations()
RETURNS TABLE (organization_id UUID) AS $$
BEGIN
    RETURN QUERY
    SELECT om.organization_id 
    FROM public.organization_members om
    WHERE om.user_id = auth.uid() AND om.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Security helper to fetch user's accessible branches
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
    WHERE om.user_id = auth.uid() AND om.role = 'clinic_admin' AND om.is_active = TRUE;
END;
$$ LANGUAGE plpgsql SECURITY DEFINER;

-- Enable RLS on all tables
ALTER TABLE public.organizations ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.subscription_status ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branches ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.user_profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.organization_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.branch_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.customers ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.pets ENABLE ROW LEVEL SECURITY;
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
ALTER TABLE public.tax_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoices ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_items ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.invoice_adjustments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.payments ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.email_templates ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.app_settings ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.audit_logs ENABLE ROW LEVEL SECURITY;

-- 32. DEFINE POLICIES

-- User Profiles
CREATE POLICY select_user_profile ON public.user_profiles
    FOR SELECT USING (auth.uid() = id OR is_super_admin = TRUE OR id IN (
        SELECT user_id FROM public.organization_members WHERE organization_id IN (SELECT public.get_user_organizations())
    ));

CREATE POLICY update_user_profile ON public.user_profiles
    FOR UPDATE USING (auth.uid() = id);

-- Organizations
CREATE POLICY select_organization ON public.organizations
    FOR SELECT USING (id IN (SELECT public.get_user_organizations()));

CREATE POLICY update_organization ON public.organizations
    FOR UPDATE USING (id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE organization_id = id AND role = 'clinic_admin'
    ));

-- Subscription Status
CREATE POLICY select_subscription ON public.subscription_status
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) OR (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = TRUE);

CREATE POLICY manage_subscription ON public.subscription_status
    FOR ALL USING ((SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = TRUE);

-- Branches
CREATE POLICY select_branch ON public.branches
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND id IN (SELECT public.get_user_branches()));

CREATE POLICY manage_branch ON public.branches
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE organization_id = organization_id AND role = 'clinic_admin'
    ));

-- Org Members
CREATE POLICY select_org_member ON public.organization_members
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY manage_org_member ON public.organization_members
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE organization_id = organization_id AND role = 'clinic_admin'
    ));

-- Branch Members
CREATE POLICY select_branch_member ON public.branch_members
    FOR SELECT USING (branch_id IN (SELECT public.get_user_branches()));

CREATE POLICY manage_branch_member ON public.branch_members
    FOR ALL USING (branch_id IN (SELECT public.get_user_branches()) AND auth.uid() IN (
        SELECT om.user_id FROM public.organization_members om 
        JOIN public.branches b ON b.organization_id = om.organization_id
        WHERE b.id = branch_id AND om.role = 'clinic_admin'
    ));

-- Customers
CREATE POLICY select_customer ON public.customers
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

CREATE POLICY manage_customer ON public.customers
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

-- Pets
CREATE POLICY select_pet ON public.pets
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY manage_pet ON public.pets
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()));

-- Appointments
-- SELECT is allowed for organization members, or public bookings where user is anonymous (to check slot metadata - wait, in V1 let's keep it simple, public inserts are open)
CREATE POLICY select_appointment ON public.appointments
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY insert_appointment_public ON public.appointments
    FOR INSERT WITH CHECK (TRUE); -- Allows anyone (public booking) to insert

CREATE POLICY manage_appointment ON public.appointments
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()));

-- Visits
CREATE POLICY select_visit ON public.visits
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

CREATE POLICY manage_visit ON public.visits
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

-- Visit Assignments
CREATE POLICY select_visit_assignment ON public.visit_assignments
    FOR SELECT USING (visit_id IN (SELECT id FROM public.visits WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY manage_visit_assignment ON public.visit_assignments
    FOR ALL USING (visit_id IN (SELECT id FROM public.visits WHERE organization_id IN (SELECT public.get_user_organizations())));

-- Clinical Notes
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

-- Prescription Revisions & Items
CREATE POLICY select_prescription_revision ON public.prescription_revisions
    FOR SELECT USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY manage_prescription_revision ON public.prescription_revisions
    FOR ALL USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY select_prescription_item ON public.prescription_items
    FOR SELECT USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY manage_prescription_item ON public.prescription_items
    FOR ALL USING (prescription_id IN (SELECT id FROM public.prescriptions WHERE organization_id IN (SELECT public.get_user_organizations())));

-- Products & Categories
CREATE POLICY select_product ON public.products
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY manage_product ON public.products
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role = 'clinic_admin'
    ));

CREATE POLICY select_product_category ON public.product_categories
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY manage_product_category ON public.product_categories
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role = 'clinic_admin'
    ));

-- Inventory Batches & Movements
CREATE POLICY select_inventory_batch ON public.inventory_batches
    FOR SELECT USING (product_id IN (SELECT id FROM public.products WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY manage_inventory_batch ON public.inventory_batches
    FOR ALL USING (product_id IN (SELECT id FROM public.products WHERE organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role = 'clinic_admin'
    )));

CREATE POLICY select_stock_movement ON public.stock_movements
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

CREATE POLICY manage_stock_movement ON public.stock_movements
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

-- Tax Settings
CREATE POLICY select_tax_setting ON public.tax_settings
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY manage_tax_setting ON public.tax_settings
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role = 'clinic_admin'
    ));

-- Invoices & Items & Adjustments
CREATE POLICY select_invoice ON public.invoices
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

CREATE POLICY manage_invoice ON public.invoices
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role IN ('clinic_admin', 'receptionist')
    ));

CREATE POLICY select_invoice_item ON public.invoice_items
    FOR SELECT USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY manage_invoice_item ON public.invoice_items
    FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY select_invoice_adjustment ON public.invoice_adjustments
    FOR SELECT USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));

CREATE POLICY manage_invoice_adjustment ON public.invoice_adjustments
    FOR ALL USING (invoice_id IN (SELECT id FROM public.invoices WHERE organization_id IN (SELECT public.get_user_organizations())));

-- Payments
CREATE POLICY select_payment ON public.payments
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()));

CREATE POLICY manage_payment ON public.payments
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND branch_id IN (SELECT public.get_user_branches()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role IN ('clinic_admin', 'receptionist')
    ));

-- Email & App Settings
CREATE POLICY select_email_template ON public.email_templates
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY manage_email_template ON public.email_templates
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role = 'clinic_admin'
    ));

CREATE POLICY select_app_setting ON public.app_settings
    FOR SELECT USING (organization_id IN (SELECT public.get_user_organizations()));

CREATE POLICY manage_app_setting ON public.app_settings
    FOR ALL USING (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
        SELECT user_id FROM public.organization_members WHERE role = 'clinic_admin'
    ));

-- Audit Logs (Only clinic admins can view their org audit logs, super admins can view all)
CREATE POLICY select_audit_log ON public.audit_logs
    FOR SELECT USING (
        (organization_id IN (SELECT public.get_user_organizations()) AND auth.uid() IN (
            SELECT user_id FROM public.organization_members WHERE organization_id = public.audit_logs.organization_id AND role = 'clinic_admin'
        ))
        OR (SELECT is_super_admin FROM public.user_profiles WHERE id = auth.uid()) = TRUE
    );

CREATE POLICY insert_audit_log ON public.audit_logs
    FOR INSERT WITH CHECK (TRUE); -- Allows the system or trigger context to write audit logs
