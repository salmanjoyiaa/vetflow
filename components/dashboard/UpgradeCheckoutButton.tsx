'use client';

import { useState } from 'react';
import { Loader2, ArrowRight } from 'lucide-react';

interface UpgradeCheckoutButtonProps {
  plan: 'growth' | 'enterprise';
  stripeEnabled: boolean;
  disabled?: boolean;
}

export default function UpgradeCheckoutButton({
  plan,
  stripeEnabled,
  disabled,
}: UpgradeCheckoutButtonProps) {
  const [loading, setLoading] = useState(false);
  const [error, setError] = useState<string | null>(null);

  const handleCheckout = async () => {
    if (!stripeEnabled) {
      setError('Contact sales@vetflow.com for enterprise billing.');
      return;
    }

    setLoading(true);
    setError(null);
    try {
      const res = await fetch('/api/billing/checkout', {
        method: 'POST',
        headers: { 'Content-Type': 'application/json' },
        body: JSON.stringify({ plan }),
      });
      const data = await res.json();
      if (!res.ok) {
        throw new Error(data.error || 'Checkout failed');
      }
      if (data.url) {
        window.location.href = data.url;
      }
    } catch (err: unknown) {
      setError(err instanceof Error ? err.message : 'Checkout failed');
      setLoading(false);
    }
  };

  return (
    <div className="w-full">
      <button
        type="button"
        disabled={disabled || loading}
        onClick={handleCheckout}
        className="w-full py-2.5 rounded-xl bg-primary/20 text-primary text-xs font-bold hover:bg-primary/30 transition-colors flex items-center justify-center gap-1 disabled:opacity-50"
      >
        {loading ? (
          <Loader2 className="w-3.5 h-3.5 animate-spin" />
        ) : (
          <>
            {stripeEnabled ? 'Upgrade with Stripe' : 'Contact sales'}
            <ArrowRight className="w-3.5 h-3.5" />
          </>
        )}
      </button>
      {error && <p className="text-[10px] text-destructive mt-1 text-center">{error}</p>}
    </div>
  );
}

