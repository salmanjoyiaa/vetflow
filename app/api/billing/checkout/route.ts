import { NextRequest, NextResponse } from 'next/server';
import {
  assertCapability,
  assertOrganization,
  resolveServerAuthContext,
} from '@/lib/auth/context';
import { isStripeConfigured } from '@/lib/stripe/config';

export async function POST(request: NextRequest) {
  if (!isStripeConfigured()) {
    return NextResponse.json(
      { error: 'Stripe is not configured. Set STRIPE_SECRET_KEY and price IDs.' },
      { status: 503 }
    );
  }

  const ctx = await resolveServerAuthContext();
  if (!ctx) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    assertOrganization(ctx);
    assertCapability(ctx, 'manage_subscription');
  } catch {
    return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
  }

  const body = await request.json();
  const plan = body.plan === 'enterprise' ? 'enterprise' : 'growth';
  const priceId =
    plan === 'enterprise'
      ? process.env.STRIPE_PRICE_ENTERPRISE
      : process.env.STRIPE_PRICE_GROWTH;

  if (!priceId) {
    return NextResponse.json({ error: 'Price not configured' }, { status: 503 });
  }

  const Stripe = (await import('stripe')).default;
  const stripe = new Stripe(process.env.STRIPE_SECRET_KEY!);

  const origin = request.nextUrl.origin;

  const session = await stripe.checkout.sessions.create({
    mode: 'subscription',
    line_items: [{ price: priceId, quantity: 1 }],
    success_url: `${origin}/dashboard/upgrade?checkout=success`,
    cancel_url: `${origin}/dashboard/upgrade?checkout=cancelled`,
    client_reference_id: ctx.organizationId,
    customer_email: ctx.email,
    metadata: {
      organization_id: ctx.organizationId,
      plan_name: plan,
    },
  });

  return NextResponse.json({ url: session.url });
}
