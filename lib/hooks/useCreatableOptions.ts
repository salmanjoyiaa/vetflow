'use client';

import { useCallback, useMemo, useState } from 'react';
import { useRouter } from 'next/navigation';
import type { CreatableOption } from '@/components/ui/premium/CreatableSelect';

type InitialOption = { id?: string; name: string } | CreatableOption;

function toCreatableOption(item: InitialOption): CreatableOption {
  if ('value' in item && 'label' in item) return item;
  return { value: item.name, label: item.name };
}

export function useCreatableOptions(
  initial: InitialOption[],
  onCreate?: (label: string) => Promise<{ name: string } | void>,
  options?: { refreshOnCreate?: boolean }
) {
  const router = useRouter();
  const [extra, setExtra] = useState<CreatableOption[]>([]);

  const optionsList = useMemo(() => {
    const base = initial.map(toCreatableOption);
    const seen = new Set(base.map((o) => o.value.toLowerCase()));
    const merged = [...base];
    for (const o of extra) {
      if (!seen.has(o.value.toLowerCase())) {
        merged.push(o);
        seen.add(o.value.toLowerCase());
      }
    }
    return merged;
  }, [initial, extra]);

  const addOption = useCallback((name: string) => {
    const trimmed = name.trim();
    if (!trimmed) return;
    setExtra((prev) => {
      if (prev.some((o) => o.value.toLowerCase() === trimmed.toLowerCase())) return prev;
      return [...prev, { value: trimmed, label: trimmed }];
    });
  }, []);

  const handleCreate = useCallback(
    async (label: string) => {
      const trimmed = label.trim();
      if (!trimmed) return;
      if (onCreate) {
        const result = await onCreate(trimmed);
        addOption(result?.name ?? trimmed);
      } else {
        addOption(trimmed);
      }
      if (options?.refreshOnCreate !== false) {
        router.refresh();
      }
    },
    [onCreate, addOption, options?.refreshOnCreate, router]
  );

  return { options: optionsList, handleCreate, addOption };
}
