'use client';

import { useRouter, useSearchParams, usePathname } from 'next/navigation';
import { useCallback, useMemo, useState } from 'react';
import {
  formatDateYmd,
  parseDateYmd,
  resolveDateFromParam,
  startOfToday,
  addDaysToDate,
  type DateFilterPreset,
} from '@/lib/utils/date-filters';

interface DateRangeQuickFilterProps {
  paramKey?: string;
  className?: string;
  showWeek?: boolean;
}

export default function DateRangeQuickFilter({
  paramKey = 'date',
  className = '',
  showWeek = true,
}: DateRangeQuickFilterProps) {
  const router = useRouter();
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const paramValue = searchParams.get(paramKey);
  const selectedDate = resolveDateFromParam(paramValue);

  const [customDate, setCustomDate] = useState(selectedDate);

  const activePreset = useMemo((): DateFilterPreset => {
    const today = formatDateYmd(startOfToday());
    const tomorrow = formatDateYmd(addDaysToDate(startOfToday(), 1));
    if (selectedDate === today) return 'today';
    if (selectedDate === tomorrow) return 'tomorrow';
    const weekEnd = formatDateYmd(addDaysToDate(startOfToday(), 6));
    if (selectedDate >= today && selectedDate <= weekEnd && showWeek) {
      // only highlight week if not today/tomorrow — use custom for specific days in week
    }
    return 'custom';
  }, [selectedDate, showWeek]);

  const pushDate = useCallback(
    (date: string) => {
      const params = new URLSearchParams(searchParams.toString());
      params.set(paramKey, date);
      router.push(`${pathname}?${params.toString()}`);
    },
    [router, pathname, searchParams, paramKey]
  );

  const pillClass = (active: boolean) =>
    `px-3 py-1.5 rounded-lg text-[10px] font-bold border transition-all ${
      active
        ? 'bg-primary text-white border-primary'
        : 'border-outline-variant/50 text-on-surface-variant hover:border-primary/40'
    }`;

  return (
    <div className={`flex flex-wrap items-center gap-2 ${className}`}>
      <button
        type="button"
        onClick={() => pushDate(formatDateYmd(startOfToday()))}
        className={pillClass(activePreset === 'today')}
      >
        Today
      </button>
      <button
        type="button"
        onClick={() => pushDate(formatDateYmd(addDaysToDate(startOfToday(), 1)))}
        className={pillClass(activePreset === 'tomorrow')}
      >
        Tomorrow
      </button>
      {showWeek && (
        <button
          type="button"
          onClick={() => pushDate(formatDateYmd(startOfToday()))}
          className={pillClass(false)}
          title="Shows today; use list filters for full week"
        >
          This week
        </button>
      )}
      <input
        type="date"
        value={customDate}
        onChange={(e) => {
          setCustomDate(e.target.value);
          if (parseDateYmd(e.target.value)) pushDate(e.target.value);
        }}
        className="px-2 py-1.5 rounded-lg text-[10px] font-semibold bg-surface-container/30 border border-outline-variant/50 text-on-surface outline-none focus:border-primary"
      />
    </div>
  );
}
