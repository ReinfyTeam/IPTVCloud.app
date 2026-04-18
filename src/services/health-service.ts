import { getCache, setCache } from '@/services/cache-service';
import { getChannels } from '@/services/channel-service';
import type { Channel } from '@/types';

export type HealthStatus = {
  channelId: string;
  status: 'ok' | 'dead' | 'slow' | 'unknown';
  checkedAt: number;
  rttMs?: number;
  url: string;
  workingUrl?: string;
  error?: string;
};

const HEALTH_INDEX_KEY = 'health:index';
const HEALTH_TTL_SECONDS = process.env.HEALTH_TTL ? Number(process.env.HEALTH_TTL) : 60 * 30;

async function probeUrl(url: string, timeoutMs = 8000) {
  const start = Date.now();
  const controller = new AbortController();
  const timeout = setTimeout(() => controller.abort(), timeoutMs);

  try {
    let response = await fetch(url, { method: 'HEAD', redirect: 'follow', signal: controller.signal });
    if (!response.ok) {
      response = await fetch(url, {
        method: 'GET',
        headers: { Range: 'bytes=0-1023' },
        redirect: 'follow',
        signal: controller.signal,
      });
    }

    clearTimeout(timeout);
    const rttMs = Date.now() - start;

    if (response.ok) {
      return {
        status: rttMs < 3000 ? 'ok' : 'slow',
        rttMs,
        url,
      } as const;
    }

    return {
      status: 'dead' as const,
      rttMs,
      url,
      error: `http_${response.status}`,
    };
  } catch (error) {
    clearTimeout(timeout);
    return {
      status: 'dead' as const,
      rttMs: Date.now() - start,
      url,
      error: error instanceof Error ? error.message : String(error),
    };
  }
}

export async function probeChannel(channel: Channel): Promise<HealthStatus> {
  const primary = await probeUrl(channel.streamUrl);
  let result: HealthStatus = {
    channelId: channel.id,
    status: primary.status,
    checkedAt: Date.now(),
    rttMs: primary.rttMs,
    url: channel.streamUrl,
    workingUrl: primary.status === 'dead' ? undefined : channel.streamUrl,
    error: primary.error,
  };

  if (primary.status === 'dead') {
    for (const fallbackUrl of channel.fallbackUrls || []) {
      const fallback = await probeUrl(fallbackUrl);
      if (fallback.status !== 'dead') {
        result = {
          channelId: channel.id,
          status: fallback.status,
          checkedAt: Date.now(),
          rttMs: fallback.rttMs,
          url: channel.streamUrl,
          workingUrl: fallbackUrl,
          error: fallback.error,
        };
        break;
      }
    }
  }

  await setCache(`health:channel:${result.channelId}`, result, HEALTH_TTL_SECONDS);

  const index = (await getCache<string[]>(HEALTH_INDEX_KEY)) || [];
  if (!index.includes(result.channelId)) {
    index.push(result.channelId);
    await setCache(HEALTH_INDEX_KEY, index, HEALTH_TTL_SECONDS);
  }

  return result;
}

export async function probeAllChannels(options?: { concurrency?: number; limit?: number }) {
  const concurrency = options?.concurrency || 10;
  const { channels } = await getChannels();
  const list = typeof options?.limit === 'number' ? channels.slice(0, options.limit) : channels;
  const summary = {
    total: list.length,
    ok: 0,
    slow: 0,
    dead: 0,
    unknown: 0,
    durationMs: 0,
    checkedAt: Date.now(),
  };

  const startedAt = Date.now();

  for (let index = 0; index < list.length; index += concurrency) {
    const batch = list.slice(index, index + concurrency);
    const results = await Promise.all(
      batch.map((channel) =>
        probeChannel(channel).catch(() => ({
          channelId: channel.id,
          status: 'unknown' as const,
          checkedAt: Date.now(),
          url: channel.streamUrl,
        })),
      ),
    );

    for (const result of results) {
      if (result.status === 'ok') summary.ok += 1;
      else if (result.status === 'slow') summary.slow += 1;
      else if (result.status === 'dead') summary.dead += 1;
      else summary.unknown += 1;
    }
  }

  summary.durationMs = Date.now() - startedAt;
  summary.checkedAt = Date.now();
  return summary;
}

export async function getHealth(channelId: string) {
  return getCache<HealthStatus>(`health:channel:${channelId}`);
}

export async function listHealth(limit?: number) {
  const index = (await getCache<string[]>(HEALTH_INDEX_KEY)) || [];
  const ids = typeof limit === 'number' ? index.slice(0, limit) : index;
  const items = await Promise.all(ids.map((id) => getCache<HealthStatus>(`health:channel:${id}`)));
  return items.filter(Boolean) as HealthStatus[];
}
