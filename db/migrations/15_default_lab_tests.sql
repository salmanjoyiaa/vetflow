-- Seed default lab test catalog for orgs that have none (mirrors services backfill in migration 11).
INSERT INTO public.lab_tests (organization_id, name, description, price)
SELECT o.id, t.name, t.description, t.price
FROM public.organizations o
CROSS JOIN (
    VALUES
        ('Complete Blood Count', 'CBC panel', 25.00),
        ('Skin Scrape Cytology', 'Dermatology cytology', 18.00),
        ('Urinalysis', 'Routine urinalysis', 20.00)
) AS t(name, description, price)
WHERE NOT EXISTS (
    SELECT 1 FROM public.lab_tests lt WHERE lt.organization_id = o.id
);
