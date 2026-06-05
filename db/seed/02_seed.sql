-- ====================================================================
-- VetFlow Seed Data (02_seed.sql)
-- Populates auth.users, auth.identities, organizations, branches,
-- roles, members, inventory, clinical notes, visits, prescriptions,
-- invoices, invoice items, and payments.
-- Password for all test users is: password123
-- ====================================================================

-- 1. CLEAN EXISTING DATA (For fresh seed runs)
TRUNCATE public.payments CASCADE;
TRUNCATE public.invoice_items CASCADE;
TRUNCATE public.invoices CASCADE;
TRUNCATE public.prescription_items CASCADE;
TRUNCATE public.prescriptions CASCADE;
TRUNCATE public.clinical_notes CASCADE;
TRUNCATE public.visit_assignments CASCADE;
TRUNCATE public.visits CASCADE;
TRUNCATE public.appointments CASCADE;
TRUNCATE public.stock_movements CASCADE;
TRUNCATE public.products CASCADE;
TRUNCATE public.product_categories CASCADE;
TRUNCATE public.pets CASCADE;
TRUNCATE public.customers CASCADE;
TRUNCATE public.tax_settings CASCADE;
TRUNCATE public.organization_members CASCADE;
TRUNCATE public.branch_members CASCADE;
TRUNCATE public.branches CASCADE;
TRUNCATE public.organizations CASCADE;
TRUNCATE public.user_profiles CASCADE;

-- Delete from auth.identities and auth.users
DELETE FROM auth.identities WHERE user_id IN (
    '77777777-7777-7777-7777-777777777777',
    'a9000000-0000-0000-0000-000000000000',
    'ad000000-0000-0000-0000-000000000000',
    'ae000000-0000-0000-0000-000000000000',
    'b9000000-0000-0000-0000-000000000000',
    'bd000000-0000-0000-0000-000000000000'
);

DELETE FROM auth.identities WHERE user_id IN (SELECT id FROM auth.users WHERE email = 'salmanjoyiaa@gmail.com');

DELETE FROM auth.users WHERE id IN (
    '77777777-7777-7777-7777-777777777777',
    'a9000000-0000-0000-0000-000000000000',
    'ad000000-0000-0000-0000-000000000000',
    'ae000000-0000-0000-0000-000000000000',
    'b9000000-0000-0000-0000-000000000000',
    'bd000000-0000-0000-0000-000000000000'
);

DELETE FROM auth.users WHERE email = 'salmanjoyiaa@gmail.com';

-- 2. CREATE AUTH USERS & IDENTITIES
CREATE EXTENSION IF NOT EXISTS pgcrypto;

-- Insert users
INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'salmanjoyiaa@gmail.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Platform","last_name":"Admin","is_super_admin":true}', now(), now(), '', '', '', ''),
('a9000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Sarah","last_name":"Owner","is_super_admin":false}', now(), now(), '', '', '', ''),
('ad000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Alexander","last_name":"Fleming","is_super_admin":false}', now(), now(), '', '', '', ''),
('ae000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'receptionist.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Emily","last_name":"Desk","is_super_admin":false}', now(), now(), '', '', '', ''),
('b9000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.b@animalhospital.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Michael","last_name":"Admin","is_super_admin":false}', now(), now(), '', '', '', ''),
('bd000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor.b@animalhospital.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Gregory","last_name":"House","is_super_admin":false}', now(), now(), '', '', '', '');

-- Insert identities (Supabase Auth requires rows in auth.identities for logins to succeed)
INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
('77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', '{"sub":"77777777-7777-7777-7777-777777777777","email":"salmanjoyiaa@gmail.com","email_verified":true}'::jsonb, 'email', '77777777-7777-7777-7777-777777777777', now(), now(), now()),
('a9000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000', '{"sub":"a9000000-0000-0000-0000-000000000000","email":"admin.a@vetcare.com","email_verified":true}'::jsonb, 'email', 'a9000000-0000-0000-0000-000000000000', now(), now(), now()),
('ad000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', '{"sub":"ad000000-0000-0000-0000-000000000000","email":"doctor.a@vetcare.com","email_verified":true}'::jsonb, 'email', 'ad000000-0000-0000-0000-000000000000', now(), now(), now()),
('ae000000-0000-0000-0000-000000000000', 'ae000000-0000-0000-0000-000000000000', '{"sub":"ae000000-0000-0000-0000-000000000000","email":"receptionist.a@vetcare.com","email_verified":true}'::jsonb, 'email', 'ae000000-0000-0000-0000-000000000000', now(), now(), now()),
('b9000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000', '{"sub":"b9000000-0000-0000-0000-000000000000","email":"admin.b@animalhospital.com","email_verified":true}'::jsonb, 'email', 'b9000000-0000-0000-0000-000000000000', now(), now(), now()),
('bd000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000', '{"sub":"bd000000-0000-0000-0000-000000000000","email":"doctor.b@animalhospital.com","email_verified":true}'::jsonb, 'email', 'bd000000-0000-0000-0000-000000000000', now(), now(), now());

-- Update user profiles superadmin state
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
('a0000000-0000-0000-0000-000000000000', 'ae000000-0000-0000-0000-000000000000', 'receptionist', true),
('b0000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000', 'clinic_admin', true),
('b0000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000', 'doctor', true);

-- 7. ASSIGN BRANCH MEMBERSHIP
INSERT INTO public.branch_members (branch_id, user_id) VALUES
('a1000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000'), -- Admin to A1
('a2000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000'), -- Admin to A2
('a1000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000'), -- Doctor A to A1
('a1000000-0000-0000-0000-000000000000', 'ae000000-0000-0000-0000-000000000000'), -- Receptionist A to A1
('b1000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000'), -- Admin B to B1
('b1000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000'); -- Doctor B to B1

-- 8. CUSTOMERS
INSERT INTO public.customers (id, organization_id, branch_id, first_name, last_name, email, phone, address) VALUES
('c1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'John', 'Doe', 'john.doe@gmail.com', '555-9090', '101 Elm St, New York'),
('c2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'Jane', 'Smith', 'jane.smith@gmail.com', '555-8080', '202 Oak St, New York'),
('c3000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'Bob', 'Johnson', 'bob.johnson@gmail.com', '555-7070', '303 Maple St, Boston');

-- 9. PETS
INSERT INTO public.pets (id, organization_id, customer_id, name, species, breed, gender, date_of_birth, weight_kg, allergies, medical_notes) VALUES
('e1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'Max', 'Dog', 'Golden Retriever', 'Male', '2022-01-15', 32.50, 'None', 'Healthy active pet'),
('e2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Bella', 'Cat', 'Siamese', 'Spayed Female', '2023-04-10', 4.20, 'Penicillin', 'Allergic to specific antibiotics'),
('e3000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-000000000000', 'Rocky', 'Dog', 'German Shepherd', 'Neutered Male', '2021-09-01', 38.00, 'None', 'Hip problems');

-- 10. PRODUCT CATEGORIES
INSERT INTO public.product_categories (id, organization_id, name) VALUES
('ca100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Medicines'),
('ca200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Nutrition'),
('ca300000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Services');

-- 11. PRODUCTS
INSERT INTO public.products (id, organization_id, branch_id, category_id, name, brand, sku, unit, type, purchase_price, selling_price, stock_quantity, reorder_level, is_active) VALUES
('fd100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca100000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', 'VetMed', 'AMX-250', 'tablet', 'medicine', 0.50, 1.50, 200, 20, true),
('fd200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca200000-0000-0000-0000-000000000000', 'Premium Puppy Food', 'Purina', 'PUR-PPF-10', 'pack', 'food', 12.00, 25.00, 15, 3, true),
('fd300000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca300000-0000-0000-0000-000000000000', 'General Consultation', 'VetFlow', 'SVC-CONSULT', 'session', 'service', 0.00, 50.00, 9999, 0, true);

-- 12. TAX SETTINGS
INSERT INTO public.tax_settings (organization_id, is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services) VALUES
('a0000000-0000-0000-0000-000000000000', true, 'VAT', 15.00, true, true);

-- 13. APPOINTMENTS
INSERT INTO public.appointments (id, organization_id, branch_id, pet_id, customer_name, customer_email, customer_phone, pet_name, pet_species, preferred_date, preferred_time, reason, status, doctor_id) VALUES
('ab100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'John Doe', 'john.doe@gmail.com', '555-9090', 'Max', 'Dog', current_date, '10:00:00', 'Routine checkup & vaccinations', 'confirmed', 'ad000000-0000-0000-0000-000000000000'),
('ab200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000000', 'Jane Smith', 'jane.smith@gmail.com', '555-8080', 'Bella', 'Cat', current_date, '14:30:00', 'Ear scratching check', 'confirmed', 'ad000000-0000-0000-0000-000000000000');

-- 14. VISITS (Waiting, Consulting, and Completed)
INSERT INTO public.visits (id, organization_id, branch_id, pet_id, customer_id, appointment_id, reason, status, checked_in_at, completed_at) VALUES
-- Visit 1: Active walk-in waiting
('d1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'ab200000-0000-0000-0000-000000000000', 'Severe ear irritation', 'waiting', now() - interval '20 minutes', null),

-- Visit 2: Consulting in progress
('d2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'ab100000-0000-0000-0000-000000000000', 'Limping on right hind leg', 'consulting', now() - interval '45 minutes', null),

-- Visit 3: Completed yesterday
('d3000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', null, 'Routine skin allergy booster', 'completed', now() - interval '1 day 2 hours', now() - interval '1 day 1 hour');

-- Assign doctors
INSERT INTO public.visit_assignments (visit_id, doctor_id, assigned_at) VALUES
('d1000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', now() - interval '15 minutes'),
('d2000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', now() - interval '40 minutes');

-- 15. CLINICAL NOTES (For Visit 3)
INSERT INTO public.clinical_notes (id, visit_id, chief_complaint, history, examination_findings, diagnosis, treatment_plan, follow_up_recommendation, created_by) VALUES
('c0100000-0000-0000-0000-000000000000', 'd3000000-0000-0000-0000-000000000000', 'Mild dermatitis and skin itch', 'History of seasonal allergies in spring', 'Redness around paws and belly. No signs of infection.', 'Atopic Dermatitis', 'Start Amoxicillin as prophylaxis, keep paws clean.', 'Recheck in 10 days if itching persists', 'ad000000-0000-0000-0000-000000000000');

-- 16. PRESCRIPTIONS
INSERT INTO public.prescriptions (id, organization_id, branch_id, visit_id, pet_id, doctor_id, revision_number, notes, is_finalized) VALUES
('fb100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'd3000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', 1, 'Standard antibiotic course for skin scratch prevention', true);

INSERT INTO public.prescription_items (prescription_id, product_id, medicine_name, dosage, frequency, duration, instructions, quantity_requested) VALUES
('fb100000-0000-0000-0000-000000000000', 'fd100000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', '1 tablet', 'Twice daily', '7 days', 'Give with food to prevent nausea', 14);

-- 17. INVOICES (Unpaid and Paid)
-- Invoice 1: Unpaid for Visit 2
INSERT INTO public.invoices (id, organization_id, branch_id, invoice_number, customer_id, pet_id, visit_id, subtotal, discount, tax_percentage, tax_amount, total, payment_status, notes, created_by) VALUES
('fa100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'INV-2026-0001', 'c1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 75.00, 0.00, 15.00, 11.25, 86.25, 'unpaid', 'Due on completion of doctor consulting.', 'ad000000-0000-0000-0000-000000000000');

INSERT INTO public.invoice_items (invoice_id, product_id, name, quantity, unit_price, tax_amount, total) VALUES
('fa100000-0000-0000-0000-000000000000', 'fd300000-0000-0000-0000-000000000000', 'General Consultation', 1, 50.00, 7.50, 57.50),
('fa100000-0000-0000-0000-000000000000', 'fd200000-0000-0000-0000-000000000000', 'Premium Puppy Food', 1, 25.00, 3.75, 28.75);

-- Invoice 2: Paid for Visit 3
INSERT INTO public.invoices (id, organization_id, branch_id, invoice_number, customer_id, pet_id, visit_id, subtotal, discount, tax_percentage, tax_amount, total, payment_status, notes, created_by, paid_at) VALUES
('fa200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'INV-2026-0002', 'c1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'd3000000-0000-0000-0000-000000000000', 71.00, 0.00, 15.00, 10.65, 81.65, 'paid', 'Fully settled.', 'ad000000-0000-0000-0000-000000000000', now() - interval '1 day');

INSERT INTO public.invoice_items (invoice_id, product_id, name, quantity, unit_price, tax_amount, total) VALUES
('fa200000-0000-0000-0000-000000000000', 'fd300000-0000-0000-0000-000000000000', 'General Consultation', 1, 50.00, 7.50, 57.50),
('fa200000-0000-0000-0000-000000000000', 'fd100000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', 14, 1.50, 3.15, 24.15);

-- 18. PAYMENTS
INSERT INTO public.payments (organization_id, branch_id, invoice_id, amount, payment_method, reference_number, created_by, created_at) VALUES
('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'fa200000-0000-0000-0000-000000000000', 81.65, 'cash', 'CASH-99120', 'ae000000-0000-0000-0000-000000000000', now() - interval '1 day');


-- ====================================================================
-- PLATFORM AD-HOC UTILITY QUERIES (FOR SQL EDITOR RUNS)
-- ====================================================================
--
-- 1. MAKE AN AUTH USER A PLATFORM SUPERADMIN:
--    UPDATE public.user_profiles SET is_super_admin = TRUE WHERE id = 'user-uuid-here';
--
-- 2. RESET/FORCE ACTIVE DEMO MEMBERSHIP FOR USER 'a9000000-0000-0000-0000-000000000000':
--    UPDATE public.organization_members SET is_active = TRUE WHERE user_id = 'a9000000-0000-0000-0000-000000000000';
--
-- 3. CHECK PLATFORM SUBSCRIPTION MATRIX:
--    SELECT org.name, sub.plan_name, sub.status FROM public.organizations org LEFT JOIN public.subscription_status sub ON org.id = sub.organization_id;
-- ====================================================================
