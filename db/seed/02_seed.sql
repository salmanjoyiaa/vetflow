-- ====================================================================
-- VetFlow Seed Data (02_seed.sql)
-- Populates auth.users (with trigger syncing to public.user_profiles),
-- organizations, branches, roles, members, inventory, invoices, etc.
-- Password for all test users is: password123
-- ====================================================================

-- 1. CLEAN EXISTING DATA (For fresh seed runs)
TRUNCATE public.organization_members CASCADE;
TRUNCATE public.branch_members CASCADE;
TRUNCATE public.organizations CASCADE;
TRUNCATE public.user_profiles CASCADE;
-- Delete from auth.users (Only run in test environments!)
DELETE FROM auth.users WHERE id IN (
    '77777777-7777-7777-7777-777777777777',
    'a9000000-0000-0000-0000-000000000000',
    'ad000000-0000-0000-0000-000000000000',
    'ar000000-0000-0000-0000-000000000000',
    'b9000000-0000-0000-0000-000000000000',
    'bd000000-0000-0000-0000-000000000000'
);

-- 2. CREATE AUTH USERS
-- Hashing password 'password123' using pgcrypto's crypt and gen_salt
-- If pgcrypto is not enabled on auth schema, it can be run using extension pgcrypto.
CREATE EXTENSION IF NOT EXISTS pgcrypto;

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, is_super_admin, created_at, updated_at) VALUES
('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'superadmin@vetflow.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email"}', '{"first_name":"Platform","last_name":"Admin","is_super_admin":true}', true, now(), now()),
('a9000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email"}', '{"first_name":"Sarah","last_name":"Owner","is_super_admin":false}', false, now(), now()),
('ad000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email"}', '{"first_name":"Alexander","last_name":"Fleming","is_super_admin":false}', false, now(), now()),
('ar000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'receptionist.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email"}', '{"first_name":"Emily","last_name":"Desk","is_super_admin":false}', false, now(), now()),
('b9000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.b@animalhospital.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email"}', '{"first_name":"Michael","last_name":"Admin","is_super_admin":false}', false, now(), now()),
('bd000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor.b@animalhospital.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email"}', '{"first_name":"Gregory","last_name":"House","is_super_admin":false}', false, now(), now());

-- (Trigger on_auth_user_created automatically populates public.user_profiles!)

-- Since the trigger is async/immediate, let's make sure the is_super_admin flag is correct for Platform Admin.
UPDATE public.user_profiles SET is_super_admin = TRUE WHERE id = '77777777-7777-7777-7777-777777777777';

-- 3. CREATE ORGANIZATIONS
INSERT INTO public.organizations (id, name, slug) VALUES
('a0000000-0000-0000-0000-000000000000', 'VetCare Center', 'vetcare'),
('b0000000-0000-0000-0000-000000000000', 'Animal Hospital Group', 'animalhospital');

-- 4. CREATE SUBSCRIPTION STATUS
INSERT INTO public.subscription_status (id, organization_id, plan_name, status, trial_start, trial_end, notes) VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000000', 'growth', 'active', now(), now() + interval '30 days', 'Paid active subscription'),
(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000000', 'trial', 'trial', now(), now() + interval '14 days', 'New trial organization');

-- 5. CREATE BRANCHES
INSERT INTO public.branches (id, organization_id, name, address, phone, email, is_active) VALUES
('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Downtown Clinic', '123 Main St, New York', '555-0101', 'downtown@vetcare.com', true),
('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Uptown Branch', '456 High St, New York', '555-0102', 'uptown@vetcare.com', true),
('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'East Wing Main', '789 Broad St, Boston', '555-0201', 'east@animalhospital.com', true);

-- 6. ASSIGN ORGANIZATION MEMBERSHIP (Roles)
INSERT INTO public.organization_members (organization_id, user_id, role, is_active) VALUES
('a0000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000', 'clinic_admin', true),
('a0000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', 'doctor', true),
('a0000000-0000-0000-0000-000000000000', 'ar000000-0000-0000-0000-000000000000', 'receptionist', true),
('b0000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000', 'clinic_admin', true),
('b0000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000', 'doctor', true);

-- 7. ASSIGN BRANCH MEMBERSHIP
INSERT INTO public.branch_members (branch_id, user_id) VALUES
('a1000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000'), -- Admin to A1
('a2000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000'), -- Admin to A2
('a1000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000'), -- Doctor A to A1
('a1000000-0000-0000-0000-000000000000', 'ar000000-0000-0000-0000-000000000000'), -- Receptionist A to A1
('b1000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000'), -- Admin B to B1
('b1000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000'); -- Doctor B to B1

-- 8. CUSTOMERS (For Org A, Branch A1)
INSERT INTO public.customers (id, organization_id, branch_id, first_name, last_name, email, phone, address) VALUES
('c1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'John', 'Doe', 'john.doe@gmail.com', '555-9090', '101 Elm St, New York'),
('c2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'Jane', 'Smith', 'jane.smith@gmail.com', '555-8080', '202 Oak St, New York'),
-- Customer for Org B
('c3000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'Bob', 'Johnson', 'bob.johnson@gmail.com', '555-7070', '303 Maple St, Boston');

-- 9. PETS
INSERT INTO public.pets (id, organization_id, customer_id, name, species, breed, gender, date_of_birth, weight_kg, allergies, medical_notes) VALUES
('p1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Max', 'Dog', 'Golden Retriever', 'Male', '2022-01-15', 32.50, 'None', 'Healthy active pet'),
('p2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Bella', 'Cat', 'Siamese', 'Spayed Female', '2023-04-10', 4.20, 'Penicillin', 'Allergic to specific antibiotics'),
('p3000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-000000000000', 'Rocky', 'Dog', 'German Shepherd', 'Neutered Male', '2021-09-01', 38.00, 'None', 'Hip problems');

-- 10. PRODUCT CATEGORIES
INSERT INTO public.product_categories (id, organization_id, name) VALUES
('ca100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Medicines'),
('ca200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Nutrition'),
('ca300000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Services');

-- 11. PRODUCTS (Org A, Branch A1)
INSERT INTO public.products (id, organization_id, branch_id, category_id, name, brand, sku, unit, type, purchase_price, selling_price, stock_quantity, reorder_level, is_active) VALUES
('pr100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca100000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', 'VetMed', 'AMX-250', 'tablet', 'medicine', 0.50, 1.50, 200, 20, true),
('pr200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca200000-0000-0000-0000-000000000000', 'Premium Puppy Food', 'Purina', 'PUR-PPF-10', 'pack', 'food', 12.00, 25.00, 15, 3, true),
('pr300000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca300000-0000-0000-0000-000000000000', 'General Consultation', 'VetFlow', 'SVC-CONSULT', 'session', 'service', 0.00, 50.00, 9999, 0, true);

-- 12. TAX SETTINGS (Org A)
INSERT INTO public.tax_settings (organization_id, is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services) VALUES
('a0000000-0000-0000-0000-000000000000', true, 'VAT', 15.00, true, true);
