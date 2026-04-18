type StoredItem = { value: string; expiresAt: number | null };

const memStore = new Map<string, StoredItem>();
let redisClient: any | null = null;

async function initRedis() {
  if (redisClient !== null) return redisClient;

  const url = process.env.UPSTASH_REDIS_REST_URL;
  const token = process.env.UPSTASH_REDIS_REST_TOKEN;
  if (!url || !token) return null;

  try {
    const mod = await import('@upstash/redis');
    const Redis = (mod as any).Redis || (mod as any).default?.Redis || (mod as any).default;

    if (!Redis) {
      throw new Error('Invalid @upstash/redis module');
    }

    redisClient = new Redis({ url, token });
    return redisClient;
  } catch {
    redisClient = null;
    return null;
  }
}

export async function getCache<T = unknown>(key: string): Promise<T | null> {
  const client = await initRedis();

  if (client) {
    try {
      const result = await client.get(key);
      if (result === null || result === undefined) return null;
      return typeof result === 'string' ? (JSON.parse(result) as T) : (result as T);
    } catch {
      // Fall back to local memory cache.
    }
  }

  const item = memStore.get(key);
  if (!item) return null;

  if (item.expiresAt && item.expiresAt < Date.now()) {
    memStore.delete(key);
    return null;
  }

  try {
    return JSON.parse(item.value) as T;
  } catch {
    return item.value as T;
  }
}

export async function setCache(key: string, value: unknown, ttlSeconds?: number): Promise<void> {
  const client = await initRedis();
  const serialized = typeof value === 'string' ? value : JSON.stringify(value);

  if (client) {
    try {
      if (ttlSeconds) {
        await client.set(key, serialized, { ex: ttlSeconds });
      } else {
        await client.set(key, serialized);
      }
      return;
    } catch {
      // Fall back to local memory cache.
    }
  }

  memStore.set(key, {
    value: serialized,
    expiresAt: ttlSeconds ? Date.now() + ttlSeconds * 1000 : null,
  });
}

export async function deleteCache(key: string): Promise<void> {
  const client = await initRedis();

  if (client) {
    try {
      await client.del(key);
      return;
    } catch {
      // Fall through to local memory cache.
    }
  }

  memStore.delete(key);
}
