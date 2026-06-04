import { redirect } from 'next/navigation';
import Link from 'next/link';
import { createClient } from '@/lib/supabase/server';
import {
  assertCapability,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { isStripeConfigured } from '@/lib/stripe/config';
import DeniedState from '@/components/ui/premium/DeniedState';
import GlassPanel from '@/components/ui/premium/GlassPanel';
import PageHeader from '@/components/ui/premium/PageHeader';
import UpgradeCheckoutButton from '@/components/dashboard/UpgradeCheckoutButton';
import { Sparkles, Check } from 'lucide-react';

export const metadata = {
  title: 'Upgrade Plan',
  description: 'VetFlow premium upgrade pathway',
};

const PLANS = [
  {
    id: 'trial',
    name: 'Trial',
    price: '$0',
    features: ['1 branch', 'Core scheduling', 'Walk-in queue', '14-day evaluation'],
    checkoutPlan: null as null,
  },
  {
    id: 'growth',
    name: 'Growth',
    price: '$149/mo',
    features: ['Multi-branch', 'Inventory', 'Reports', 'AI-ready modules'],
    highlighted: true,
    checkoutPlan: 'growth' as const,
  },
  {
    id: 'enterprise',
    name: 'Enterprise',
    price: 'Custom',
    features: ['Unlimited branches', 'Dedicated support', 'Custom integrations', 'SLA'],
    checkoutPlan: 'enterprise' as const,
  },
];

export default async function UpgradePage({
  searchParams,
}: {
  searchParams: Promise<{ checkout?: string }>;
}) {
  const ctx = await resolveServerAuthContext();
  if (!ctx) redirect('/login');

  const params = await searchParams;
  const stripeEnabled = isStripeConfigured();

  try {
    assertCapability(ctx, 'manage_subscription');
  } catch {
    return (
      <DeniedState
        title="Upgrade restricted"
        message="Only clinic administrators can manage subscription plans."
      />
    );
  }

  const supabase = await createClient();
  const { data: sub } = await supabase
    .from('subscription_status')
    .select('plan_name, status, trial_end, renewal_date, notes')
    .eq('organization_id', ctx.organizationId!)
    .maybeSingle();

  const currentPlan = (sub?.plan_name || 'trial').toLowerCase();
  const currentStatus = sub?.status || 'trial';

  return (
    <div className="space-y-8">
      <PageHeader
        title="Premium upgrade pathway"
        description="Unlock AI modules, multi-branch intelligence, and growth analytics."
        icon={Sparkles}
      />

      {params.checkout === 'success' && (
        <GlassPanel className="border-secondary/30 text-secondary text-sm">
          Checkout completed. Your plan will update shortly once Stripe webhook processing is
          configured.
        </GlassPanel>
      )}
      {params.checkout === 'cancelled' && (
        <GlassPanel className="border-outline-variant text-on-surface-variant text-sm">
          Checkout was cancelled.
        </GlassPanel>
      )}

      <GlassPanel className="border-primary/20">
        <div className="flex flex-wrap items-center justify-between gap-4">
          <div>
            <p className="text-[10px] font-bold uppercase text-on-surface-variant tracking-wider">
              Current subscription
            </p>
            <p className="text-lg font-bold text-on-surface capitalize mt-1">
              {currentPlan} · {currentStatus}
            </p>
            {sub?.trial_end && currentStatus === 'trial' && (
              <p className="text-xs text-tertiary mt-1">
                Trial ends {new Date(sub.trial_end).toLocaleDateString()}
              </p>
            )}
          </div>
          {currentStatus === 'suspended' && (
            <span className="text-xs font-bold text-destructive px-3 py-1 rounded-full border border-destructive/30">
              Account suspended — contact support
            </span>
          )}
        </div>
        {!stripeEnabled && (
          <p className="text-[10px] text-on-surface-variant mt-3">
            Add STRIPE_SECRET_KEY, NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY, and STRIPE_PRICE_GROWTH to
            enable checkout.
          </p>
        )}
      </GlassPanel>

      <div className="grid md:grid-cols-3 gap-6">
        {PLANS.map((plan) => {
          const isCurrent = currentPlan === plan.id;
          return (
            <div
              key={plan.id}
              className={`glass-panel p-6 flex flex-col ${
                'highlighted' in plan && plan.highlighted ? 'ring-1 ring-primary/40' : ''
              }`}
            >
              <h3 className="text-sm font-bold text-on-surface">{plan.name}</h3>
              <p className="text-2xl font-bold text-primary mt-2 font-[family-name:var(--font-display)]">
                {plan.price}
              </p>
              <ul className="mt-4 space-y-2 flex-1">
                {plan.features.map((f) => (
                  <li key={f} className="text-xs text-on-surface-variant flex gap-2">
                    <Check className="w-3.5 h-3.5 text-secondary shrink-0 mt-0.5" />
                    {f}
                  </li>
                ))}
              </ul>
              {isCurrent ? (
                <span className="mt-6 text-center text-xs font-bold text-primary py-2">
                  Current plan
                </span>
              ) : currentStatus !== 'suspended' && plan.checkoutPlan ? (
                <div className="mt-6">
                  <UpgradeCheckoutButton
                    plan={plan.checkoutPlan}
                    stripeEnabled={stripeEnabled}
                  />
                </div>
              ) : (
                <span className="mt-6 text-center text-[10px] text-outline">
                  {plan.id === 'trial' ? 'Starter tier' : 'Contact sales'}
                </span>
              )}
            </div>
          );
        })}
      </div>

      <p className="text-[10px] text-on-surface-variant text-center">
        Plan state syncs with the platform admin console.
        {sub?.notes && ` Note: ${sub.notes}`}
      </p>

      <div className="text-center">
        <Link href="/dashboard/settings" className="text-xs text-secondary hover:underline">
          Back to clinic settings
        </Link>
      </div>
    </div>
  );
}

