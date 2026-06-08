/**
 * Lightweight in-memory fixed-window rate limiter.
 *
 * Intended for low-volume, abuse-prevention use cases such as the public
 * appointment booking endpoint. State is per server instance (not shared
 * across a horizontally scaled deployment); for stricter guarantees move
 * this to Redis/Upstash. It is deliberately dependency-free for the MVP.
 */

interface WindowState {
  count: number;
  resetAt: number;
}

const buckets = new Map<string, WindowState>();

export interface RateLimitResult {
  allowed: boolean;
  remaining: number;
  retryAfterSeconds: number;
}

/**
 * @param key       Unique caller identity (e.g. `public-booking:<ip>`).
 * @param limit     Max requests permitted per window.
 * @param windowMs  Window length in milliseconds.
 */
export function checkRateLimit(
  key: string,
  limit: number,
  windowMs: number
): RateLimitResult {
  const now = Date.now();
  const existing = buckets.get(key);

  if (!existing || existing.resetAt <= now) {
    buckets.set(key, { count: 1, resetAt: now + windowMs });
    return { allowed: true, remaining: limit - 1, retryAfterSeconds: 0 };
  }

  if (existing.count >= limit) {
    return {
      allowed: false,
      remaining: 0,
      retryAfterSeconds: Math.ceil((existing.resetAt - now) / 1000),
    };
  }

  existing.count += 1;
  return {
    allowed: true,
    remaining: limit - existing.count,
    retryAfterSeconds: 0,
  };
}

/** Periodically evict stale buckets to bound memory. */
function sweep() {
  const now = Date.now();
  for (const [key, state] of buckets) {
    if (state.resetAt <= now) {
      buckets.delete(key);
    }
  }
}

// Best-effort cleanup; unref so it never keeps the process alive.
if (typeof setInterval !== 'undefined') {
  const timer = setInterval(sweep, 5 * 60 * 1000);
  if (typeof (timer as any)?.unref === 'function') {
    (timer as any).unref();
  }
}
