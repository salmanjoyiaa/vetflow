export function isStripeConfigured(): boolean {
  return Boolean(
    process.env.STRIPE_SECRET_KEY &&
      process.env.STRIPE_PRICE_GROWTH &&
      process.env.NEXT_PUBLIC_STRIPE_PUBLISHABLE_KEY
  );
}

export const STRIPE_PLANS = {
  growth: {
    priceEnv: 'STRIPE_PRICE_GROWTH',
    label: 'Growth',
    amountLabel: '$149/mo',
  },
  enterprise: {
    priceEnv: 'STRIPE_PRICE_ENTERPRISE',
    label: 'Enterprise',
    amountLabel: 'Custom',
  },
} as const;
