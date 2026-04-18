import { getCache, setCache } from '@/services/cache-service';
import { generateId, parseM3U } from '@/lib/m3uParser';
import { getCountryName } from '@/lib/countries';
import { getLanguageName } from '@/lib/languages';
import type {
  Channel,
  ChannelDataset,
  ChannelFilters,
  ChannelQuery,
  PaginatedChannels,
  SearchResponse,
} from '@/types';

const DEFAULT_M3U_URL = process.env.M3U_PRIMARY_URL || 'https://iptv-org.github.io/iptv/index.m3u';
const CACHE_TTL_MS = process.env.M3U_CACHE_TTL
  ? Number(process.env.M3U_CACHE_TTL) * 1000
  : 10 * 60 * 1000;
const CHANNELS_CACHE_KEY = 'channels:dataset';

function normalizeChannel(channel: Channel): Channel {
  const isGeoBlocked = channel.name.includes('[GEO BLOCKED]');

  // 1. Remove [GEO BLOCKED]
  let cleanName = channel.name.replace('[GEO BLOCKED]', '');

  // 2. Remove browser strings
  cleanName = cleanName.replace(/(?:Gecko\)|(?:Chrome|Safari|Edg)\/\d+(?:\.\d+)*)/gi, '');

  // 3. Keep existing logic to extract language before removal
  let lang = channel.language;
  if (!lang || lang === 'Uncategorized') {
    const match = cleanName.match(/\(([^)]+)\)$/);
    if (match) lang = match[1];
  }

  // 4. Remove language tags (e.g., (EN)) and empty parens
  cleanName = cleanName.replace(/\([A-Z]{2,3}\)/gi, '');
  cleanName = cleanName.replace(/\(\s*\)/g, '');

  // 5. Cleanup whitespace
  cleanName = cleanName.replace(/\s+/g, ' ').trim();

  // Clean language from resolution tags
  if (lang) {
    lang = lang.replace(/\b(4K|2160p|1080p|720p|576p|480p|FHD|HD|SD)\b/gi, '').trim();
  }

  // Generate a random stable viewers count between 100 and 5000 based on the hashed ID
  const viewersCount = 100 + (parseInt(generateId(channel.name).slice(0, 4), 16) % 4901);

  return {
    ...channel,
    id: channel.id || generateId(`${channel.streamUrl}:${channel.name}`),
    name: cleanName,
    logo: channel.logo || undefined,
    country: getCountryName(channel.country || 'International').toUpperCase(),
    language: getLanguageName(lang || ''),
    category: channel.category || 'uncategorized',
    fallbackUrls: Array.from(new Set(channel.fallbackUrls || [])),
    isLive: true,
    isGeoBlocked,
    viewersCount,
  };
}

function dedupeChannels(channels: Channel[]): Channel[] {
  const map = new Map<string, Channel>();

  channels.forEach((ch, idx) => {
    const normalized = normalizeChannel(ch);
    const key = normalized.epgId || normalized.streamUrl;
    const existing = map.get(key);

    if (!existing) {
      map.set(key, normalized);
      return;
    }

    const fallbackUrls = new Set([
      ...(existing.fallbackUrls || []),
      existing.streamUrl !== normalized.streamUrl ? normalized.streamUrl : '',
      ...(normalized.fallbackUrls || []),
    ]);

    map.set(key, {
      ...existing,
      name: existing.name || normalized.name,
      logo: existing.logo || normalized.logo,
      country: existing.country || normalized.country,
      language: existing.language || normalized.language,
      category: existing.category || normalized.category,
      resolution: existing.resolution || normalized.resolution,
      fallbackUrls: Array.from(fallbackUrls).filter(Boolean),
    });
  });

  return Array.from(map.values());
}

export async function refreshChannels(): Promise<ChannelDataset> {
  const response = await fetch(DEFAULT_M3U_URL, {
    cache: 'no-store',
  });

  if (!response.ok) {
    throw new Error(`Failed to fetch M3U: ${response.status}`);
  }

  const source = await response.text();
  const { channels: rawChannels, epgUrl } = parseM3U(source);
  const channels = dedupeChannels(rawChannels);
  const dataset: ChannelDataset = { channels, fetchedAt: Date.now(), epgUrl };

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
    Array.from(new Set(values.filter(Boolean).map((value) => value!.trim()))).sort((a, b) =>
      a.localeCompare(b),
    );

  return {
    countries: normalize(channels.map((channel) => channel.country)),
    categories: normalize(channels.map((channel) => channel.category)),
    languages: normalize(channels.map((channel) => channel.language)),
    resolutions: normalize(channels.map((channel) => channel.resolution)),
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

  if (query.resolution) {
    const value = query.resolution.toLowerCase();
    items = items.filter((channel) => channel.resolution?.toLowerCase() === value);
  }

  if (query.ids && query.ids.length > 0) {
    const ids = new Set(query.ids);
    items = items.filter((channel) => ids.has(channel.id));
  }

  // Sort by name (alphabetical) as a baseline ranking
  return items.sort((a, b) => a.name.localeCompare(b.name));
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

export async function getEpgUrl(): Promise<string | undefined> {
  const dataset = await getChannels(false);
  return dataset.epgUrl;
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
