'use client';

import { useEffect } from 'react';
import { useRouter } from 'next/navigation';

/** Refreshes server data on an interval while the tab is visible. */
export function useVisibilityPolling(intervalMs = 20000, enabled = true) {
  const router = useRouter();

  useEffect(() => {
    if (!enabled) return;

    let timer: ReturnType<typeof setInterval> | null = null;

    const tick = () => {
      if (document.visibilityState === 'visible') {
        router.refresh();
      }
    };

    const start = () => {
      if (timer) return;
      timer = setInterval(tick, intervalMs);
    };

    const stop = () => {
      if (timer) {
        clearInterval(timer);
        timer = null;
      }
    };

    const onVisibility = () => {
      if (document.visibilityState === 'visible') {
        tick();
        start();
      } else {
        stop();
      }
    };

    if (document.visibilityState === 'visible') {
      start();
    }

    document.addEventListener('visibilitychange', onVisibility);
    return () => {
      stop();
      document.removeEventListener('visibilitychange', onVisibility);
    };
  }, [router, intervalMs, enabled]);
}
