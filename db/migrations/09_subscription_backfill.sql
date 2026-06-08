-- Backfill subscription_status for orgs missing a row + auto-provision on new orgs

INSERT INTO public.subscription_status (
    organization_id,
    plan_id,
    plan_name,
    status,
    trial_start,
    trial_end,
    features,
    notes
)
SELECT
    o.id,
    'starter',
    'starter',
    'trial',
    timezone('utc'::text, now()),
    timezone('utc'::text, now()) + interval '30 days',
    '{}'::jsonb,
    'Auto-provisioned subscription backfill'
FROM public.organizations o
WHERE NOT EXISTS (
    SELECT 1 FROM public.subscription_status s WHERE s.organization_id = o.id
);

CREATE OR REPLACE FUNCTION public.provision_default_subscription()
RETURNS TRIGGER
LANGUAGE plpgsql
SECURITY DEFINER
SET search_path = public
AS $$
BEGIN
    INSERT INTO public.subscription_status (
        organization_id,
        plan_id,
        plan_name,
        status,
        trial_start,
        trial_end,
        features,
        notes
    ) VALUES (
        NEW.id,
        'starter',
        'starter',
        'trial',
        timezone('utc'::text, now()),
        timezone('utc'::text, now()) + interval '30 days',
        '{}'::jsonb,
        'Auto-provisioned on organization create'
    )
    ON CONFLICT (organization_id) DO NOTHING;
    RETURN NEW;
END;
$$;

DROP TRIGGER IF EXISTS trg_provision_default_subscription ON public.organizations;
CREATE TRIGGER trg_provision_default_subscription
    AFTER INSERT ON public.organizations
    FOR EACH ROW EXECUTE FUNCTION public.provision_default_subscription();
