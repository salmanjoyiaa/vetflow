'use client';

import { useState, useTransition } from 'react';
import { useRouter } from 'next/navigation';
import { updateOrganizationFeaturesAction } from '@/lib/services/super-admin-actions';
import {
  SUPERADMIN_TOGGLEABLE_FEATURES,
  OPT_IN_FEATURES,
  FEATURE_LABELS,
  type Feature,
} from '@/lib/auth/features';

type OrganizationFeatureTogglesProps = {
  organizationId: string;
  initialFeatures: Record<string, boolean> | null;
};

export default function OrganizationFeatureToggles({
  organizationId,
  initialFeatures,
}: OrganizationFeatureTogglesProps) {
  const router = useRouter();
  const [isPending, startTransition] = useTransition();
  const [state, setState] = useState<Record<Feature, boolean>>(() => {
    const out = {} as Record<Feature, boolean>;
    for (const f of SUPERADMIN_TOGGLEABLE_FEATURES) {
      // Opt-in features default OFF; standard features default ON.
      out[f] = OPT_IN_FEATURES.includes(f)
        ? initialFeatures?.[f] === true
        : initialFeatures?.[f] !== false;
    }
    return out;
  });

  const handleToggle = (feature: Feature) => {
    const next = { ...state, [feature]: !state[feature] };
    setState(next);
    startTransition(async () => {
      const res = await updateOrganizationFeaturesAction({
        organizationId,
        features: next,
      });
      if (res.success) {
        router.refresh();
      } else {
        alert(res.error || 'Failed to update features');
        setState(state);
      }
    });
  };

  return (
    <div className="w-full max-w-xs space-y-2 text-left">
      <p className="text-[9px] font-bold text-on-surface-variant uppercase tracking-wider">
        Feature access
      </p>
      <ul className="space-y-1.5">
        {SUPERADMIN_TOGGLEABLE_FEATURES.map((feature) => (
          <li key={feature} className="flex items-center justify-between gap-2">
            <span className="text-[10px] text-on-surface-variant">
              {FEATURE_LABELS[feature]}
            </span>
            <button
              type="button"
              disabled={isPending}
              onClick={() => handleToggle(feature)}
              className={`w-9 h-5 rounded-full p-0.5 transition-colors ${
                state[feature] ? 'bg-primary' : 'bg-outline-variant'
              }`}
              aria-pressed={state[feature]}
            >
              <span
                className={`block w-4 h-4 rounded-full bg-white transition-transform ${
                  state[feature] ? 'translate-x-4' : ''
                }`}
              />
            </button>
          </li>
        ))}
      </ul>
    </div>
  );
}
