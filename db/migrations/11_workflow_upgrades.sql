-- Workflow upgrades: services catalog, visit services, appointment attribution,
-- consult timing, structured follow-ups, consult_tracking feature

-- ====================================================================
-- 1. SERVICES CATALOG (org-scoped)
-- ====================================================================
CREATE TABLE public.services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    organization_id UUID NOT NULL REFERENCES public.organizations(id) ON DELETE CASCADE,
    name VARCHAR(255) NOT NULL,
    description TEXT,
    price NUMERIC(10, 2) NOT NULL DEFAULT 0,
    is_active BOOLEAN NOT NULL DEFAULT TRUE,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL,
    updated_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE TRIGGER update_services_updated_at
    BEFORE UPDATE ON public.services
    FOR EACH ROW EXECUTE FUNCTION update_updated_at_column();

CREATE INDEX idx_services_org ON public.services (organization_id);

-- ====================================================================
-- 2. VISIT SERVICES (performed during consultation)
-- ====================================================================
CREATE TABLE public.visit_services (
    id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
    visit_id UUID NOT NULL REFERENCES public.visits(id) ON DELETE CASCADE,
    service_id UUID REFERENCES public.services(id) ON DELETE SET NULL,
    name VARCHAR(255) NOT NULL,
    unit_price NUMERIC(10, 2) NOT NULL,
    quantity INTEGER NOT NULL DEFAULT 1,
    added_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    created_at TIMESTAMP WITH TIME ZONE DEFAULT timezone('utc'::text, now()) NOT NULL
);

CREATE INDEX idx_visit_services_visit ON public.visit_services (visit_id);

-- ====================================================================
-- 3. APPOINTMENT ATTRIBUTION + FOLLOW-UP LINK
-- ====================================================================
ALTER TABLE public.appointments
    ADD COLUMN IF NOT EXISTS created_by UUID REFERENCES public.user_profiles(id) ON DELETE SET NULL,
    ADD COLUMN IF NOT EXISTS created_by_role TEXT,
    ADD COLUMN IF NOT EXISTS follow_up_of_visit_id UUID REFERENCES public.visits(id) ON DELETE SET NULL;

-- ====================================================================
-- 4. CONSULT TIMING
-- ====================================================================
ALTER TABLE public.visits
    ADD COLUMN IF NOT EXISTS consult_started_at TIMESTAMP WITH TIME ZONE;

-- ====================================================================
-- 5. STRUCTURED FOLLOW-UP DAYS
-- ====================================================================
ALTER TABLE public.clinical_notes
    ADD COLUMN IF NOT EXISTS follow_up_days INTEGER[];

-- ====================================================================
-- 6. RLS
-- ====================================================================
ALTER TABLE public.services ENABLE ROW LEVEL SECURITY;
ALTER TABLE public.visit_services ENABLE ROW LEVEL SECURITY;

CREATE POLICY select_services ON public.services
    FOR SELECT USING (
        organization_id IN (SELECT public.get_user_organizations())
    );

CREATE POLICY manage_services ON public.services
    FOR ALL USING (
        organization_id IN (SELECT public.get_user_organizations())
        AND public.has_org_role(organization_id, ARRAY['clinic_admin'])
    );

CREATE POLICY select_visit_service ON public.visit_services
    FOR SELECT USING (
        visit_id IN (
            SELECT id FROM public.visits
            WHERE organization_id IN (SELECT public.get_user_organizations())
        )
    );

CREATE POLICY manage_visit_service ON public.visit_services
    FOR ALL USING (
        visit_id IN (
            SELECT id FROM public.visits
            WHERE organization_id IN (SELECT public.get_user_organizations())
        )
    );

-- ====================================================================
-- 7. SEED DEFAULT SERVICES FOR EXISTING ORGS
-- ====================================================================
INSERT INTO public.services (organization_id, name, description, price)
SELECT o.id, s.name, s.description, s.price
FROM public.organizations o
CROSS JOIN (
    VALUES
        ('Consultation', 'General veterinary consultation', 50.00),
        ('Vaccination', 'Routine vaccination', 35.00),
        ('Lab Test', 'Laboratory diagnostic test', 45.00),
        ('Deworming', 'Deworming treatment', 25.00),
        ('Grooming', 'Basic grooming service', 40.00),
        ('Surgery - Minor', 'Minor surgical procedure', 150.00)
) AS s(name, description, price)
WHERE NOT EXISTS (
    SELECT 1 FROM public.services sv WHERE sv.organization_id = o.id
);
