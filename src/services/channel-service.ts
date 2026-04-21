import { getCache, setCache } from '@/services/cache-service';
import { generateId } from '@/lib/m3uParser'; // Just for hashing viewers
import { getCountryName } from '@/lib/countries';
import { getLanguageName } from '@/lib/languages';
import db from '@/lib/db';
import type {
  Channel,
  ChannelDataset,
  ChannelFilters,
  ChannelQuery,
  PaginatedChannels,
  SearchResponse,
} from '@/types';

async function fetchCommunityChannels(): Promise<Channel[]> {
  try {
    const { rows } = await db.query(`SELECT * FROM "CustomChannel" WHERE "isApproved" = TRUE`);

    return rows.map((row) => ({
      id: row.id,
      name: row.name,
      logo: row.logo,
      country: row.country,
      language: row.language,
      category: row.category,
      streamUrl: row.streamUrl,
      description: row.description,
      isLive: true,
      source: 'community',
      viewersCount: 100 + (parseInt(generateId(row.name).slice(0, 4), 16) % 4901),
    }));
  } catch (error) {
    console.error('Failed to fetch community channels:', error);
    return [];
  }
}

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
  const [iptvOrgData, communityChannels] = await Promise.all([
    fetchIptvOrgData(),
    fetchCommunityChannels(),
  ]);

  // Create lookups from iptv-org data
  const blocklistSet = new Set(iptvOrgData.blocklist.map((b) => b.channel));
  // ... (other lookups remain the same)
  const streamMap = new Map<string, any[]>();
  iptvOrgData.streams.forEach((s) => {
    if (s.channel) {
      if (!streamMap.has(s.channel)) streamMap.set(s.channel, []);
      streamMap.get(s.channel)!.push(s);
    }
  });

  const logoMap = new Map<string, string>();
  iptvOrgData.logos.forEach((l) => {
    if (l.channel && l.url) {
      logoMap.set(l.channel, l.url);
    }
  });

  const feedMap = new Map<string, any[]>();
  iptvOrgData.feeds.forEach((f) => {
    if (f.channel) {
      if (!feedMap.has(f.channel)) feedMap.set(f.channel, []);
      feedMap.get(f.channel)!.push(f);
    }
  });

  const guideMap = new Map<string, { site_id: string; url: string }>();
  iptvOrgData.guides.forEach((g) => {
    if (g.channel && g.site_id && g.url) {
      guideMap.set(g.channel, { site_id: g.site_id, url: g.url });
    }
  });

  const subdivisionsMap = new Map<string, string>();
  iptvOrgData.subdivisions.forEach((s) => subdivisionsMap.set(s.id, s.name));

  const citiesMap = new Map<string, string>();
  iptvOrgData.cities.forEach((c) => citiesMap.set(c.id, c.name));

  const regionsMap = new Map<string, string>();
  iptvOrgData.regions.forEach((r) => regionsMap.set(r.id, r.name));

  const channels: Channel[] = [];

  for (const ch of iptvOrgData.channels) {
    if (blocklistSet.has(ch.id) || ch.closed) continue;

    const streams = streamMap.get(ch.id) || [];
    if (streams.length === 0) continue;

    const feeds = feedMap.get(ch.id) || [];
    const primaryStream = streams[0];
    const fallbackUrls = streams.slice(1).map((s) => s.url);
    const logoUrl = logoMap.get(ch.id);
    const category = ch.categories && ch.categories.length > 0 ? ch.categories[0] : 'general';
    const guide = guideMap.get(ch.id);

    channels.push({
      id: ch.id,
      name: ch.name || 'Unknown Channel',
      logo: logoUrl,
      country: ch.country || 'International',
      subdivision: ch.subdivision ? subdivisionsMap.get(ch.subdivision) : undefined,
      city: ch.city ? citiesMap.get(ch.city) : undefined,
      region: ch.region ? regionsMap.get(ch.region) : undefined,
      language: feeds[0]?.languages[0] || 'unknown',
      category: category,
      resolution: primaryStream.quality || undefined,
      timezone: feeds[0]?.timezones[0]?.replace(/_/g, ' ') || 'unknown',
      isNsfw: ch.is_nsfw || false,
      launched: ch.launched || undefined,
      website: ch.website || undefined,
      viewersCount: 100 + (parseInt(generateId(ch.name).slice(0, 4), 16) % 4901),
      streamUrl: primaryStream.url,
      epgId: guide?.site_id,
      epgUrl: guide?.url,
      isLive: true,
      isOffline: primaryStream.status === 'offline' || primaryStream.status === 'error',
      fallbackUrls: fallbackUrls.length > 0 ? fallbackUrls : undefined,
      isGeoBlocked: primaryStream.label === 'Geo-blocked',
      description: ch.description || undefined,
      tags: ch.categories || [],
      source: 'iptv-org',
    });
  }

  const allChannels = [...channels, ...communityChannels];

  const dataset: ChannelDataset = { channels: allChannels, fetchedAt: Date.now() };
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
    subdivisions: normalize(channels.map((channel) => channel.subdivision)),
    cities: normalize(channels.map((channel) => channel.city)),
    regions: normalize(channels.map((channel) => channel.region)),
    timezones: normalize(channels.map((channel) => channel.timezone)),
    blocklist: [],
  };
}

export function filterChannels(channels: Channel[], query: ChannelQuery): Channel[] {
  let items = channels;

  // Always hide offline channels unless explicitly filtered for 'offline' status
  if (!query.status || query.status !== 'offline') {
    items = items.filter((channel) => !channel.isOffline);
  }

  if (query.q) {
    const q = query.q.toLowerCase();
    items = items.filter((channel) =>
      [
        channel.name,
        channel.country,
        channel.category,
        channel.language,
        channel.subdivision,
        channel.city,
        channel.region,
      ]
        .filter(Boolean)
        .some((value) => value!.toLowerCase().includes(q)),
    );
  }

  if (query.source) {
    items = items.filter((channel) => channel.source === query.source);
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

  if (query.subdivision) {
    const value = query.subdivision.toLowerCase();
    items = items.filter((channel) => channel.subdivision?.toLowerCase() === value);
  }

  if (query.city) {
    const value = query.city.toLowerCase();
    items = items.filter((channel) => channel.city?.toLowerCase() === value);
  }

  if (query.region) {
    const value = query.region.toLowerCase();
    items = items.filter((channel) => channel.region?.toLowerCase() === value);
  }

  if (query.ids && query.ids.length > 0) {
    const ids = new Set(query.ids);
    items = items.filter((channel) => ids.has(channel.id));
  }

  if (query.status) {
    if (query.status === 'online') {
      items = items.filter((channel) => !channel.isOffline && !channel.isGeoBlocked);
    } else if (query.status === 'offline') {
      items = items.filter((channel) => channel.isOffline);
    } else if (query.status === 'geo-blocked') {
      items = items.filter((channel) => channel.isGeoBlocked);
    }
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

export async function getChannelById(id: string, userId?: string) {
  const dataset = await getChannels(false);
  const cached = dataset.channels.find((channel) => channel.id === id) || null;
  if (cached) return cached;

  if (userId) {
    try {
      const { rows } = await db.query(
        'SELECT * FROM "CustomChannel" WHERE "id" = $1 AND "userId" = $2',
        [id, userId],
      );
      if (rows.length > 0) {
        const row = rows[0];
        return {
          id: row.id,
          name: row.name,
          logo: row.logo,
          country: row.country,
          language: row.language,
          category: row.category,
          streamUrl: row.streamUrl,
          description: row.description,
          isLive: true,
          source: 'community',
          viewersCount: 0,
        } as Channel;
      }
    } catch (error) {
      console.error('Failed to fetch private custom channel:', error);
    }
  }

  return null;
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
