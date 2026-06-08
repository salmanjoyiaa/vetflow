-- ====================================================================
-- ClinixDev Seed Data (02_seed.sql)
-- Populates auth.users/identities and demo tenant data for the vet MVP.
-- Password for all test users is: password123
-- ====================================================================

-- 1. CLEAN EXISTING DATA (for fresh seed runs)
TRUNCATE public.payments CASCADE;
TRUNCATE public.invoice_items CASCADE;
TRUNCATE public.invoices CASCADE;
TRUNCATE public.lab_orders CASCADE;
TRUNCATE public.lab_tests CASCADE;
TRUNCATE public.documents CASCADE;
TRUNCATE public.prescription_items CASCADE;
TRUNCATE public.prescriptions CASCADE;
TRUNCATE public.clinical_notes CASCADE;
TRUNCATE public.visit_assignments CASCADE;
TRUNCATE public.visits CASCADE;
TRUNCATE public.appointments CASCADE;
TRUNCATE public.stock_movements CASCADE;
TRUNCATE public.products CASCADE;
TRUNCATE public.product_categories CASCADE;
TRUNCATE public.patients CASCADE;
TRUNCATE public.customers CASCADE;
TRUNCATE public.tax_settings CASCADE;
TRUNCATE public.app_settings CASCADE;
TRUNCATE public.feature_flags CASCADE;
TRUNCATE public.organization_members CASCADE;
TRUNCATE public.branch_members CASCADE;
TRUNCATE public.branches CASCADE;
TRUNCATE public.subscription_status CASCADE;
TRUNCATE public.organizations CASCADE;
TRUNCATE public.user_profiles CASCADE;

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

INSERT INTO auth.users (id, instance_id, aud, role, email, encrypted_password, email_confirmed_at, raw_app_meta_data, raw_user_meta_data, created_at, updated_at, confirmation_token, email_change, email_change_token_new, recovery_token) VALUES
('77777777-7777-7777-7777-777777777777', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'salmanjoyiaa@gmail.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Platform","last_name":"Admin","is_super_admin":true}', now(), now(), '', '', '', ''),
('a9000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Sarah","last_name":"Owner","is_super_admin":false}', now(), now(), '', '', '', ''),
('ad000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Alexander","last_name":"Fleming","is_super_admin":false}', now(), now(), '', '', '', ''),
('ae000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'receptionist.a@vetcare.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Emily","last_name":"Desk","is_super_admin":false}', now(), now(), '', '', '', ''),
('b9000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'admin.b@animalhospital.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Michael","last_name":"Admin","is_super_admin":false}', now(), now(), '', '', '', ''),
('bd000000-0000-0000-0000-000000000000', '00000000-0000-0000-0000-000000000000', 'authenticated', 'authenticated', 'doctor.b@animalhospital.com', crypt('password123', gen_salt('bf')), now(), '{"provider":"email","providers":["email"]}', '{"first_name":"Gregory","last_name":"House","is_super_admin":false}', now(), now(), '', '', '', '');

INSERT INTO auth.identities (id, user_id, identity_data, provider, provider_id, last_sign_in_at, created_at, updated_at) VALUES
('77777777-7777-7777-7777-777777777777', '77777777-7777-7777-7777-777777777777', '{"sub":"77777777-7777-7777-7777-777777777777","email":"salmanjoyiaa@gmail.com","email_verified":true}'::jsonb, 'email', '77777777-7777-7777-7777-777777777777', now(), now(), now()),
('a9000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000', '{"sub":"a9000000-0000-0000-0000-000000000000","email":"admin.a@vetcare.com","email_verified":true}'::jsonb, 'email', 'a9000000-0000-0000-0000-000000000000', now(), now(), now()),
('ad000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', '{"sub":"ad000000-0000-0000-0000-000000000000","email":"doctor.a@vetcare.com","email_verified":true}'::jsonb, 'email', 'ad000000-0000-0000-0000-000000000000', now(), now(), now()),
('ae000000-0000-0000-0000-000000000000', 'ae000000-0000-0000-0000-000000000000', '{"sub":"ae000000-0000-0000-0000-000000000000","email":"receptionist.a@vetcare.com","email_verified":true}'::jsonb, 'email', 'ae000000-0000-0000-0000-000000000000', now(), now(), now()),
('b9000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000', '{"sub":"b9000000-0000-0000-0000-000000000000","email":"admin.b@animalhospital.com","email_verified":true}'::jsonb, 'email', 'b9000000-0000-0000-0000-000000000000', now(), now(), now()),
('bd000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000', '{"sub":"bd000000-0000-0000-0000-000000000000","email":"doctor.b@animalhospital.com","email_verified":true}'::jsonb, 'email', 'bd000000-0000-0000-0000-000000000000', now(), now(), now());

UPDATE public.user_profiles SET is_super_admin = TRUE WHERE id = '77777777-7777-7777-7777-777777777777';

-- 3. ORGANIZATIONS (vet clinic type)
INSERT INTO public.organizations (id, name, slug, clinic_type_id) VALUES
('a0000000-0000-0000-0000-000000000000', 'VetCare Center', 'vetcare', 'vet'),
('b0000000-0000-0000-0000-000000000000', 'Animal Hospital Group', 'animalhospital', 'vet');

-- 4. SUBSCRIPTION STATUS
INSERT INTO public.subscription_status (id, organization_id, plan_id, plan_name, status, trial_start, trial_end, features, notes) VALUES
(gen_random_uuid(), 'a0000000-0000-0000-0000-000000000000', 'pro', 'pro', 'active', now(), now() + interval '30 days', '{"appointments":true,"inventory":true,"sales":true,"reports":true,"multi_branch":true,"ai_assistant":false,"social_automation":false}'::jsonb, 'Paid active subscription'),
(gen_random_uuid(), 'b0000000-0000-0000-0000-000000000000', 'trial', 'trial', 'trial', now(), now() + interval '14 days', '{"appointments":true,"inventory":true,"sales":true,"reports":true,"multi_branch":false,"ai_assistant":false,"social_automation":false}'::jsonb, 'New trial organization');

-- 5. FEATURE FLAGS (org override: enable branded PDFs for VetCare)
INSERT INTO public.feature_flags (key, scope, organization_id, is_enabled, description) VALUES
('branded_pdfs', 'organization', 'a0000000-0000-0000-0000-000000000000', TRUE, 'Branded PDFs enabled for VetCare Center');

-- 6. BRANCHES
INSERT INTO public.branches (id, organization_id, name, address, phone, email, is_active) VALUES
('a1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Downtown Clinic', '123 Main St, New York', '555-0101', 'downtown@vetcare.com', true),
('a2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Uptown Branch', '456 High St, New York', '555-0102', 'uptown@vetcare.com', true),
('b1000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'East Wing Main', '789 Broad St, Boston', '555-0201', 'east@animalhospital.com', true);

-- 7. ORGANIZATION MEMBERSHIP
INSERT INTO public.organization_members (organization_id, user_id, role, is_active) VALUES
('a0000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000', 'clinic_admin', true),
('a0000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', 'doctor', true),
('a0000000-0000-0000-0000-000000000000', 'ae000000-0000-0000-0000-000000000000', 'receptionist', true),
('b0000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000', 'clinic_admin', true),
('b0000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000', 'doctor', true);

-- 8. BRANCH MEMBERSHIP
INSERT INTO public.branch_members (branch_id, user_id) VALUES
('a1000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000'),
('a2000000-0000-0000-0000-000000000000', 'a9000000-0000-0000-0000-000000000000'),
('a1000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000'),
('a1000000-0000-0000-0000-000000000000', 'ae000000-0000-0000-0000-000000000000'),
('b1000000-0000-0000-0000-000000000000', 'b9000000-0000-0000-0000-000000000000'),
('b1000000-0000-0000-0000-000000000000', 'bd000000-0000-0000-0000-000000000000');

-- 9. APP SETTINGS & TAX
INSERT INTO public.app_settings (organization_id, clinic_address, clinic_phone, clinic_email, timezone, currency, pdf_branding_enabled, pdf_footer_text) VALUES
('a0000000-0000-0000-0000-000000000000', '123 Main St, New York', '555-0101', 'hello@vetcare.com', 'America/New_York', 'USD', TRUE, 'VetCare Center — Compassionate care for every patient');

INSERT INTO public.tax_settings (organization_id, is_enabled, tax_name, tax_percentage, applies_to_products, applies_to_services) VALUES
('a0000000-0000-0000-0000-000000000000', true, 'VAT', 15.00, true, true);

-- 10. CUSTOMERS
INSERT INTO public.customers (id, organization_id, branch_id, first_name, last_name, email, phone, address) VALUES
('c1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'John', 'Doe', 'john.doe@gmail.com', '555-9090', '101 Elm St, New York'),
('c2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'Jane', 'Smith', 'jane.smith@gmail.com', '555-8080', '202 Oak St, New York'),
('c3000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'b1000000-0000-0000-0000-000000000000', 'Bob', 'Johnson', 'bob.johnson@gmail.com', '555-7070', '303 Maple St, Boston');

-- 11. PATIENTS (vet: patient_type = 'pet'; explicit patient_number)
INSERT INTO public.patients (id, organization_id, customer_id, patient_number, patient_type, name, species, breed, gender, date_of_birth, weight_kg, allergies, medical_notes, metadata) VALUES
('e1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'P-2026-00001', 'pet', 'Max', 'Dog', 'Golden Retriever', 'Male', '2022-01-15', 32.50, 'None', 'Healthy active pet', '{"color":"Golden","microchip_number":"985112000000001"}'::jsonb),
('e2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'P-2026-00002', 'pet', 'Bella', 'Cat', 'Siamese', 'Spayed Female', '2023-04-10', 4.20, 'Penicillin', 'Allergic to specific antibiotics', '{"color":"Cream","microchip_number":"985112000000002"}'::jsonb),
('e3000000-0000-0000-0000-000000000000', 'b0000000-0000-0000-0000-000000000000', 'c3000000-0000-0000-0000-000000000000', 'P-2026-00001', 'pet', 'Rocky', 'Dog', 'German Shepherd', 'Neutered Male', '2021-09-01', 38.00, 'None', 'Hip problems', '{"color":"Black/Tan"}'::jsonb);

-- 12. PRODUCT CATEGORIES & PRODUCTS
INSERT INTO public.product_categories (id, organization_id, name) VALUES
('ca100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Medicines'),
('ca200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Nutrition'),
('ca300000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Services');

INSERT INTO public.products (id, organization_id, branch_id, category_id, name, brand, sku, unit, type, purchase_price, selling_price, stock_quantity, reorder_level, is_active) VALUES
('fd100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca100000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', 'VetMed', 'AMX-250', 'tablet', 'medicine', 0.50, 1.50, 200, 20, true),
('fd200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca200000-0000-0000-0000-000000000000', 'Premium Puppy Food', 'Purina', 'PUR-PPF-10', 'pack', 'food', 12.00, 25.00, 15, 3, true),
('fd300000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'ca300000-0000-0000-0000-000000000000', 'General Consultation', 'ClinixDev', 'SVC-CONSULT', 'session', 'service', 0.00, 50.00, 9999, 0, true);

-- 13. LAB TESTS (catalog)
INSERT INTO public.lab_tests (id, organization_id, name, description, price) VALUES
('1a000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Complete Blood Count', 'CBC panel', 25.00),
('1b000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'Skin Scrape Cytology', 'Dermatology cytology', 18.00);

-- 14. APPOINTMENTS
INSERT INTO public.appointments (id, organization_id, branch_id, patient_id, customer_id, customer_name, customer_email, customer_phone, patient_name, patient_species, preferred_date, preferred_time, reason, status, doctor_id, source) VALUES
('ab100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'John Doe', 'john.doe@gmail.com', '555-9090', 'Max', 'Dog', current_date, '10:00:00', 'Routine checkup & vaccinations', 'confirmed', 'ad000000-0000-0000-0000-000000000000', 'staff'),
('ab200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'Jane Smith', 'jane.smith@gmail.com', '555-8080', 'Bella', 'Cat', current_date, '14:30:00', 'Ear scratching check', 'confirmed', 'ad000000-0000-0000-0000-000000000000', 'staff');

-- 15. VISITS
INSERT INTO public.visits (id, organization_id, branch_id, patient_id, customer_id, appointment_id, doctor_id, reason, status, checked_in_at, completed_at) VALUES
('d1000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e2000000-0000-0000-0000-000000000000', 'c2000000-0000-0000-0000-000000000000', 'ab200000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', 'Severe ear irritation', 'waiting', now() - interval '20 minutes', null),
('d2000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', 'ab100000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', 'Limping on right hind leg', 'consulting', now() - interval '45 minutes', null),
('d3000000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'c1000000-0000-0000-0000-000000000000', null, 'ad000000-0000-0000-0000-000000000000', 'Routine skin allergy booster', 'completed', now() - interval '1 day 2 hours', now() - interval '1 day 1 hour');

INSERT INTO public.visit_assignments (visit_id, doctor_id, assigned_at) VALUES
('d1000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', now() - interval '15 minutes'),
('d2000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', now() - interval '40 minutes');

-- 16. CLINICAL NOTES (Visit 3)
INSERT INTO public.clinical_notes (id, visit_id, chief_complaint, history, examination_findings, diagnosis, treatment_plan, follow_up_recommendation, created_by) VALUES
('c0100000-0000-0000-0000-000000000000', 'd3000000-0000-0000-0000-000000000000', 'Mild dermatitis and skin itch', 'History of seasonal allergies in spring', 'Redness around paws and belly. No signs of infection.', 'Atopic Dermatitis', 'Start Amoxicillin as prophylaxis, keep paws clean.', 'Recheck in 10 days if itching persists', 'ad000000-0000-0000-0000-000000000000');

-- 17. PRESCRIPTIONS
INSERT INTO public.prescriptions (id, organization_id, branch_id, visit_id, patient_id, doctor_id, revision_number, notes, is_finalized) VALUES
('fb100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'd3000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'ad000000-0000-0000-0000-000000000000', 1, 'Standard antibiotic course for skin scratch prevention', true);

INSERT INTO public.prescription_items (prescription_id, product_id, medicine_name, dosage, frequency, duration, instructions, quantity_requested) VALUES
('fb100000-0000-0000-0000-000000000000', 'fd100000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', '1 tablet', 'Twice daily', '7 days', 'Give with food to prevent nausea', 14);

-- 18. INVOICES + ITEMS + PAYMENTS
INSERT INTO public.invoices (id, organization_id, branch_id, invoice_number, customer_id, patient_id, visit_id, subtotal, discount, tax_percentage, tax_amount, total, payment_status, notes, created_by) VALUES
('fa100000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'INV-2026-0001', 'c1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'd2000000-0000-0000-0000-000000000000', 75.00, 0.00, 15.00, 11.25, 86.25, 'unpaid', 'Due on completion of doctor consulting.', 'ad000000-0000-0000-0000-000000000000');

INSERT INTO public.invoice_items (invoice_id, product_id, name, quantity, unit_price, tax_amount, total) VALUES
('fa100000-0000-0000-0000-000000000000', 'fd300000-0000-0000-0000-000000000000', 'General Consultation', 1, 50.00, 7.50, 57.50),
('fa100000-0000-0000-0000-000000000000', 'fd200000-0000-0000-0000-000000000000', 'Premium Puppy Food', 1, 25.00, 3.75, 28.75);

INSERT INTO public.invoices (id, organization_id, branch_id, invoice_number, customer_id, patient_id, visit_id, subtotal, discount, tax_percentage, tax_amount, total, payment_status, notes, created_by, paid_at) VALUES
('fa200000-0000-0000-0000-000000000000', 'a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'INV-2026-0002', 'c1000000-0000-0000-0000-000000000000', 'e1000000-0000-0000-0000-000000000000', 'd3000000-0000-0000-0000-000000000000', 71.00, 0.00, 15.00, 10.65, 81.65, 'paid', 'Fully settled.', 'ad000000-0000-0000-0000-000000000000', now() - interval '1 day');

INSERT INTO public.invoice_items (invoice_id, product_id, name, quantity, unit_price, tax_amount, total) VALUES
('fa200000-0000-0000-0000-000000000000', 'fd300000-0000-0000-0000-000000000000', 'General Consultation', 1, 50.00, 7.50, 57.50),
('fa200000-0000-0000-0000-000000000000', 'fd100000-0000-0000-0000-000000000000', 'Amoxicillin 250mg', 14, 1.50, 3.15, 24.15);

INSERT INTO public.payments (organization_id, branch_id, invoice_id, amount, payment_method, reference_number, created_by, created_at) VALUES
('a0000000-0000-0000-0000-000000000000', 'a1000000-0000-0000-0000-000000000000', 'fa200000-0000-0000-0000-000000000000', 81.65, 'cash', 'CASH-99120', 'ae000000-0000-0000-0000-000000000000', now() - interval '1 day');

-- ====================================================================
-- PLATFORM AD-HOC UTILITY QUERIES (FOR SQL EDITOR RUNS)
-- ====================================================================
-- 1. MAKE AN AUTH USER A PLATFORM SUPERADMIN:
--    UPDATE public.user_profiles SET is_super_admin = TRUE WHERE id = 'user-uuid-here';
-- 2. CHECK SUBSCRIPTION MATRIX:
--    SELECT org.name, sub.plan_name, sub.status FROM public.organizations org LEFT JOIN public.subscription_status sub ON org.id = sub.organization_id;
-- ====================================================================
