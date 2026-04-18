import { getCache, setCache } from '@/services/cache-service';
import { generateId, parseM3U } from '@/lib/m3uParser';
import type { Channel, ChannelDataset, ChannelFilters, ChannelQuery, PaginatedChannels, SearchResponse } from '@/types';

const DEFAULT_M3U_URL = process.env.M3U_PRIMARY_URL || 'https://iptv-org.github.io/iptv/index.m3u';
const CACHE_TTL_MS = process.env.M3U_CACHE_TTL
  ? Number(process.env.M3U_CACHE_TTL) * 1000
  : 10 * 60 * 1000;
const CHANNELS_CACHE_KEY = 'channels:dataset';

function normalizeChannel(channel: Channel): Channel {
  return {
    ...channel,
    id: channel.id || generateId(`${channel.streamUrl}:${channel.name}`),
    name: channel.name.trim(),
    logo: channel.logo || undefined,
    country: channel.country || undefined,
    language: channel.language || undefined,
    category: channel.category || undefined,
    fallbackUrls: Array.from(new Set(channel.fallbackUrls || [])),
    isLive: true,
  };
}

function dedupeChannels(channels: Channel[]): Channel[] {
  const map = new Map<string, Channel>();

  for (const channel of channels.map(normalizeChannel)) {
    const key = channel.epgId || channel.streamUrl;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, channel);
      continue;
    }

    const fallbackUrls = new Set([
      ...(existing.fallbackUrls || []),
      existing.streamUrl !== channel.streamUrl ? channel.streamUrl : '',
      ...(channel.fallbackUrls || []),
    ]);

    map.set(key, {
      ...existing,
      name: existing.name || channel.name,
      logo: existing.logo || channel.logo,
      country: existing.country || channel.country,
      language: existing.language || channel.language,
      category: existing.category || channel.category,
      fallbackUrls: Array.from(fallbackUrls).filter(Boolean),
    });
  }

  return Array.from(map.values());
}

export async function refreshChannels(): Promise<ChannelDataset> {
  const response = await fetch(DEFAULT_M3U_URL, {
    next: { revalidate: Math.floor(CACHE_TTL_MS / 1000) },
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch M3U: ${response.status}`);
  }

  const source = await response.text();
  const channels = dedupeChannels(parseM3U(source));
  const dataset: ChannelDataset = { channels, fetchedAt: Date.now() };

  await setCache(CHANNELS_CACHE_KEY, dataset, Math.floor(CACHE_TTL_MS / 1000));
  return dataset;
}

export async function getChannels(forceRefresh = false): Promise<ChannelDataset> {
  if (!forceRefresh) {
    const cached = await getCache<ChannelDataset>(CHANNELS_CACHE_KEY);
    if (cached && Date.now() - cached.fetchedAt < CACHE_TTL_MS) {
      return cached;
    }
  }

  try {
    return await refreshChannels();
  } catch (error) {
    const cached = await getCache<ChannelDataset>(CHANNELS_CACHE_KEY);
    if (cached) return cached;
    return { channels: [], fetchedAt: Date.now() };
  }
}

export function getChannelFilters(channels: Channel[]): ChannelFilters {
  const normalize = (values: Array<string | undefined>) =>
    Array.from(new Set(values.filter(Boolean).map((value) => value!.trim()))).sort((a, b) => a.localeCompare(b));

  return {
    countries: normalize(channels.map((channel) => channel.country)),
    categories: normalize(channels.map((channel) => channel.category)),
    languages: normalize(channels.map((channel) => channel.language)),
  };
}

export function filterChannels(channels: Channel[], query: ChannelQuery): Channel[] {
  let items = channels;

  if (query.q) {
    const q = query.q.toLowerCase();
    items = items.filter((channel) =>
      [channel.name, channel.country, channel.category, channel.language]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    );
  }

  if (query.country) {
    const value = query.country.toLowerCase();
    items = items.filter((channel) => channel.country?.toLowerCase() === value);
  }

  if (query.category) {
    const value = query.category.toLowerCase();
    items = items.filter((channel) => channel.category?.toLowerCase() === value);
  }

  if (query.language) {
    const value = query.language.toLowerCase();
    items = items.filter((channel) => channel.language?.toLowerCase() === value);
  }

  if (query.ids && query.ids.length > 0) {
    const ids = new Set(query.ids);
    items = items.filter((channel) => ids.has(channel.id));
  }

  return items;
}

export function paginateChannels(dataset: ChannelDataset, query: ChannelQuery): PaginatedChannels {
  const filtered = filterChannels(dataset.channels, query);
  const page = Math.max(1, query.page || 1);
  const limit = Math.min(100, Math.max(1, query.limit || 50));
  const start = (page - 1) * limit;

  return {
    items: filtered.slice(start, start + limit),
    total: filtered.length,
    fetchedAt: new Date(dataset.fetchedAt).toISOString(),
  };
}

export async function getChannelById(id: string) {
  const dataset = await getChannels(false);
  return dataset.channels.find((channel) => channel.id === id) || null;
}

export async function searchChannels(query: ChannelQuery): Promise<SearchResponse> {
  const dataset = await getChannels(false);
  return {
    ...paginateChannels(dataset, query),
    filters: getChannelFilters(dataset.channels),
    query: {
      q: query.q,
      page: query.page,
      limit: query.limit,
      country: query.country,
      category: query.category,
      language: query.language,
    },
  };
}
