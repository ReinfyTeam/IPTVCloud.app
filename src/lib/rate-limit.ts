type RequestRecord = {
  count: number;
  resetAt: number;
};

const store = new Map<string, RequestRecord>();

export interface RateLimitOptions {
  windowMs?: number;
  max?: number;
}

export interface RateLimitResult {
  success: boolean;
  remaining: number;
  resetAt: number;
}

export function rateLimit(
  identifier: string,
  { windowMs = 60_000, max = 10 }: RateLimitOptions = {},
): RateLimitResult {
  const now = Date.now();
  const record = store.get(identifier);

  if (!record || record.resetAt < now) {
    const resetAt = now + windowMs;
    store.set(identifier, { count: 1, resetAt });
    return { success: true, remaining: max - 1, resetAt };
  }

  if (record.count >= max) {
    return { success: false, remaining: 0, resetAt: record.resetAt };
  }

  record.count += 1;
  return { success: true, remaining: max - record.count, resetAt: record.resetAt };
}

// Clean up expired entries every 5 minutes
if (typeof globalThis !== 'undefined') {
  const cleanup = () => {
    const now = Date.now();
    for (const [key, record] of store.entries()) {
      if (record.resetAt < now) store.delete(key);
    }
  };
  setInterval(cleanup, 5 * 60 * 1000);
}
