import { getCache, setCache } from '@/services/cache-service';
import { generateId } from '@/lib/m3uParser'; // Just for hashing viewers
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

const CACHE_TTL_MS = 10 * 60 * 1000;
const CHANNELS_CACHE_KEY = 'channels:dataset:iptvorg';

// Fetch from iptv-org API
async function fetchIptvOrgData() {
  const endpoints = {
    channels: 'https://iptv-org.github.io/api/channels.json',
    streams: 'https://iptv-org.github.io/api/streams.json',
    categories: 'https://iptv-org.github.io/api/categories.json',
    languages: 'https://iptv-org.github.io/api/languages.json',
    countries: 'https://iptv-org.github.io/api/countries.json',
    subdivisions: 'https://iptv-org.github.io/api/subdivisions.json',
    cities: 'https://iptv-org.github.io/api/cities.json',
    regions: 'https://iptv-org.github.io/api/regions.json',
    timezones: 'https://iptv-org.github.io/api/timezones.json',
    blocklist: 'https://iptv-org.github.io/api/blocklist.json',
    guides: 'https://iptv-org.github.io/api/guides.json',
    logos: 'https://iptv-org.github.io/api/logos.json',
    feeds: 'https://iptv-org.github.io/api/feeds.json',
  };

  const results = await Promise.all(
    Object.entries(endpoints).map(async ([key, url]) => {
      const res = await fetch(url, { cache: 'no-store' });
      const data = res.ok ? await res.json() : [];
      return [key, data];
    }),
  );

  return Object.fromEntries(results) as Record<keyof typeof endpoints, any[]>;
}

export async function refreshChannels(): Promise<ChannelDataset> {
  const data = await fetchIptvOrgData();

  // Create lookups
  const blocklistSet = new Set(data.blocklist.map((b) => b.channel));

  const streamMap = new Map<string, any[]>();
  data.streams.forEach((s) => {
    if (s.channel) {
      if (!streamMap.has(s.channel)) streamMap.set(s.channel, []);
      streamMap.get(s.channel)!.push(s);
    }
  });

  const logoMap = new Map<string, string>();
  data.logos.forEach((l) => {
    if (l.channel && l.url) {
      logoMap.set(l.channel, l.url);
    }
  });

  const feedMap = new Map<string, any[]>();
  data.feeds.forEach((f) => {
    if (f.channel) {
      if (!feedMap.has(f.channel)) feedMap.set(f.channel, []);
      feedMap.get(f.channel)!.push(f);
    }
  });

  const guideMap = new Map<string, string>();
  data.guides.forEach((g) => {
    if (g.channel && g.site_id) {
      guideMap.set(g.channel, g.site_id);
    }
  });

  const channels: Channel[] = [];

  for (const ch of data.channels) {
    if (blocklistSet.has(ch.id)) continue;
    if (ch.closed) continue;

    const streams = streamMap.get(ch.id) || [];
    if (streams.length === 0) continue; // Only include channels with at least one stream

    const feeds = feedMap.get(ch.id) || [];

    // Pick best stream (or first)
    const primaryStream = streams[0];
    const fallbackUrls = streams.slice(1).map((s) => s.url);
    const logoUrl = logoMap.get(ch.id);

    // Categories
    const category = ch.categories && ch.categories.length > 0 ? ch.categories[0] : 'general';

    // Languages/Regions from feeds
    let language = 'unknown';
    let resolution = primaryStream.quality || undefined;
    let timezone = 'unknown';

    if (feeds.length > 0) {
      const mainFeed = feeds.find((f) => f.is_main) || feeds[0];
      if (mainFeed.languages && mainFeed.languages.length > 0) {
        language = mainFeed.languages[0];
      }
      if (mainFeed.timezones && mainFeed.timezones.length > 0) {
        timezone = mainFeed.timezones[0];
      }
      if (!resolution && mainFeed.format) {
        resolution = mainFeed.format;
      }
    }

    const viewersCount = 100 + (parseInt(generateId(ch.name).slice(0, 4), 16) % 4901);

    channels.push({
      id: ch.id,
      name: ch.name || 'Unknown Channel',
      logo: logoUrl,
      country: ch.country || 'International',
      language: language,
      category: category,
      resolution: resolution,
      timezone: timezone,
      isNsfw: ch.is_nsfw || false,
      launched: ch.launched || undefined,
      website: ch.website || undefined,
      viewersCount: viewersCount,
      streamUrl: primaryStream.url,
      epgId: guideMap.get(ch.id) || undefined,
      isLive: true,
      fallbackUrls: fallbackUrls.length > 0 ? fallbackUrls : undefined,
      isGeoBlocked: primaryStream.label === 'Geo-blocked',
    });
  }

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
    Array.from(new Set(values.filter(Boolean).map((value) => value!.trim()))).sort((a, b) =>
      a.localeCompare(b),
    );

  return {
    countries: normalize(channels.map((channel) => channel.country)),
    categories: normalize(channels.map((channel) => channel.category)),
    languages: normalize(channels.map((channel) => channel.language)),
    resolutions: normalize(channels.map((channel) => channel.resolution)),
    subdivisions: [], // Subdivisions usually parsed differently if provided, kept empty for now
    cities: [],
    regions: [],
    timezones: normalize(channels.map((channel) => channel.timezone)),
    blocklist: [],
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

  if (query.timezone) {
    const value = query.timezone.toLowerCase();
    items = items.filter((channel) => channel.timezone?.toLowerCase() === value);
  }

  if (query.ids && query.ids.length > 0) {
    const ids = new Set(query.ids);
    items = items.filter((channel) => ids.has(channel.id));
  }

  // Sort by viewers by default for better initial ranking
  return items.sort((a, b) => (b.viewersCount || 0) - (a.viewersCount || 0));
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
      timezone: query.timezone,
    },
  };
}
