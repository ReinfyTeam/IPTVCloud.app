import xml2js from 'xml2js';
import type { EpgLookupResult, EpgProgram } from '@/types';
import { getCache, setCache } from '@/services/cache-service';

const EPG_INDEX_URL = 'https://reinfyteam.github.io/IPTVCloud.app/content.json';
const EPG_BASE_URL = 'https://reinfyteam.github.io/IPTVCloud.app/sites';

interface EpgIndexEntry {
  site: string;
  path: string | string[];
  url: string | string[];
  split: boolean;
  parts: number;
  size_bytes: number;
  programmes: number;
  updated_at: string;
}

interface EpgIndex {
  generated_at: string;
  total_sites: number;
  guides: EpgIndexEntry[];
}

let epgIndexCache: EpgIndex | null = null;
const EPG_INDEX_CACHE_KEY = 'epg_index_cache';
const EPG_INDEX_CACHE_TTL = 3600; // Cache EPG index for 1 hour

async function fetchEpgIndex(): Promise<EpgIndex | null> {
  if (epgIndexCache) {
    return epgIndexCache;
  }

  const cached = await getCache<EpgIndex>(EPG_INDEX_CACHE_KEY);
  if (cached) {
    epgIndexCache = cached;
    return cached;
  }

  try {
    const response = await fetch(EPG_INDEX_URL, { next: { revalidate: 3600 } });
    if (!response.ok) {
      console.error(`Failed to fetch EPG index: ${response.statusText}`);
      return null;
    }
    const data: EpgIndex = await response.json();
    epgIndexCache = data;
    await setCache(EPG_INDEX_CACHE_KEY, data, EPG_INDEX_CACHE_TTL);
    return data;
  } catch (error) {
    console.error('Error fetching EPG index:', error);
    return null;
  }
}

function parseXmlDate(value?: string | number) {
  if (!value) return null;

  const input = String(value);
  const match = input.match(/^(\d{4})(\d{2})(\d{2})(\d{2})(\d{2})(\d{2})(?:\s*([\+\-]\d{4}))?/);

  if (match) {
    const [, year, month, day, hour, minute, second, tz] = match;
    let iso = `${year}-${month}-${day}T${hour}:${minute}:${second}`;
    iso += tz ? `${tz.slice(0, 3)}:${tz.slice(3)}` : 'Z';

    const parsed = new Date(iso);
    if (!Number.isNaN(parsed.getTime())) return parsed;
  }

  const fallback = new Date(input);
  return Number.isNaN(fallback.getTime()) ? null : fallback;
}

async function enrichWithWikiImage(title: string): Promise<string | null> {
  if (!title) return null;
  try {
    // Basic cleanup of title (remove "HD", "Season x", etc to improve wiki match)
    const cleanTitle = title
      .replace(/\b(HD|SD|FHD|4K|S\d+E\d+|Season \d+|Episode \d+)\b/gi, '')
      .split(':')[0]
      .trim();
    const url = new URL(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`,
    );
    const res = await fetch(url, {
      headers: { 'User-Agent': 'IPTVCloud.app/1.0' },
      next: { revalidate: 86400 }, // cache aggressively for 24h
    });
    if (res.ok) {
      const data = await res.json();
      return data.thumbnail?.source || null;
    }
  } catch {
    // ignore
  }
  return null;
}

async function simplifyProgram(program: any): Promise<EpgProgram | null> {
  if (!program) return null;

  const title = typeof program.title === 'string' ? program.title : program.title?._ || '';
  const desc = typeof program.desc === 'string' ? program.desc : program.desc?._ || '';

  // Extract image from standard XMLTV <icon src="..." />
  let image = program.icon?.$?.src || program.icon?.[0]?.$?.src || null;

  // If no image is provided by the XMLTV, attempt to fetch a fallback from Wikipedia
  if (!image && title) {
    image = await enrichWithWikiImage(title);
  }

  const category =
    typeof program.category === 'string'
      ? program.category
      : program.category?._ || program.category?.[0]?._ || null;

  return {
    start: parseXmlDate(program.start)?.toISOString() || null,
    stop: parseXmlDate(program.stop)?.toISOString() || null,
    title,
    desc,
    image,
    category,
  };
}

export async function fetchEpgForId(epgId: string): Promise<EpgLookupResult> {
  const epgIndex = await fetchEpgIndex();
  if (!epgIndex) {
    return { found: false, error: 'Failed to load EPG index' };
  }

  const guideEntry = epgIndex.guides.find((g) => g.site === epgId || g.path === `${epgId}.xml`);
  if (!guideEntry) {
    return { found: false, error: `EPG data not found for ID: ${epgId}` };
  }

  let xmlText: string | null = null;
  let sourceUrl: string | null = null;

  try {
    const urlsToFetch: string[] = [];
    if (guideEntry.split && Array.isArray(guideEntry.url)) {
      urlsToFetch.push(...guideEntry.url.map((p) => `${EPG_BASE_URL}${p}`));
    } else if (typeof guideEntry.url === 'string') {
      urlsToFetch.push(`${EPG_BASE_URL}${guideEntry.url}`);
    } else if (Array.isArray(guideEntry.url) && guideEntry.url.length > 0) {
      // Fallback for non-split but array of urls
      urlsToFetch.push(`${EPG_BASE_URL}${guideEntry.url[0]}`);
    }

    const xmlParts: string[] = await Promise.all(
      urlsToFetch.map(async (urlStr) => {
        const response = await fetch(urlStr, { next: { revalidate: 3600 } });
        if (!response.ok) {
          throw new Error(`Failed to fetch EPG part from ${urlStr}: ${response.statusText}`);
        }
        return response.text();
      }),
    );

    xmlText = xmlParts.join('');
    sourceUrl = urlsToFetch.join(',');
  } catch (error: any) {
    console.error(`Error fetching EPG XML for ${epgId}:`, error.message);
    return { found: false, error: `Failed to fetch EPG data: ${error.message}` };
  }

  if (!xmlText) return { found: false };

  try {
    const parsed = await xml2js.parseStringPromise(xmlText, {
      explicitArray: false,
      mergeAttrs: true,
    });

    const programmes = Array.isArray(parsed?.tv?.programme)
      ? parsed.tv.programme
      : parsed?.tv?.programme
        ? [parsed.tv.programme]
        : [];

    const now = new Date();
    let currentProgram: any = null;
    let nextProgram: any = null;
    const fullSchedule: EpgProgram[] = [];

    for (const program of programmes) {
      const progChannelId = program.channel || '';
      if (progChannelId !== epgId && !epgId.startsWith(progChannelId)) continue; // Keep this filter

      const simplified = await simplifyProgram(program);
      if (!simplified) continue;

      fullSchedule.push(simplified);

      const start = parseXmlDate(program.start);
      const stop = parseXmlDate(program.stop);
      if (!start || !stop) continue;

      if (start <= now && now < stop) {
        currentProgram = program;
      } else if (start > now && (!nextProgram || start < parseXmlDate(nextProgram.start)!)) {
        nextProgram = program;
      }
    }

    return {
      found: true,
      url: sourceUrl,
      now: await simplifyProgram(currentProgram),
      next: await simplifyProgram(nextProgram),
      schedule: fullSchedule.sort((a, b) => (a.start || '').localeCompare(b.start || '')),
      raw: xmlText.slice(0, 16 * 1024),
    };
  } catch (error: any) {
    return {
      found: true,
      url: sourceUrl,
      error: error instanceof Error ? error.message : String(error),
      raw: xmlText.slice(0, 16 * 1024),
    };
  }
}

export interface ExtractedChannel {
  id: string;
  displayName: string;
  icon?: string;
  url?: string;
}

export async function fetchAllEpgChannels(): Promise<ExtractedChannel[]> {
  const CACHE_KEY = 'epg_all_channels';
  const CACHE_TTL = 86400; // 24 hours

  const cached = await getCache<ExtractedChannel[]>(CACHE_KEY);
  if (cached) return cached;

  const epgIndex = await fetchEpgIndex();
  if (!epgIndex) return [];

  const allUrls: string[] = [];
  for (const guide of epgIndex.guides) {
    if (guide.split && Array.isArray(guide.url)) {
      allUrls.push(...guide.url.map((p) => `${EPG_BASE_URL}${p}`));
    } else if (typeof guide.url === 'string') {
      allUrls.push(`${EPG_BASE_URL}${guide.url}`);
    } else if (Array.isArray(guide.url) && guide.url.length > 0) {
      allUrls.push(`${EPG_BASE_URL}${guide.url[0]}`);
    }
  }

  // Remove duplicates just in case
  const uniqueUrls = Array.from(new Set(allUrls));

  const channelsMap = new Map<string, ExtractedChannel>();

  // Chunk array to avoid overwhelming connections
  const chunkArray = <T>(arr: T[], size: number): T[][] =>
    Array.from({ length: Math.ceil(arr.length / size) }, (v, i) =>
      arr.slice(i * size, i * size + size),
    );

  const urlChunks = chunkArray(uniqueUrls, 20);

  for (const chunk of urlChunks) {
    const promises = chunk.map(async (urlStr) => {
      try {
        const response = await fetch(urlStr, { next: { revalidate: 3600 } });
        if (!response.ok) return '';
        return await response.text();
      } catch (err) {
        return '';
      }
    });

    const results = await Promise.allSettled(promises);

    for (const res of results) {
      if (res.status === 'fulfilled' && res.value) {
        const xmlText = res.value;

        // Regex to extract <channel> blocks
        const channelBlockRegex = /<channel\s+id="([^"]+)"\s*>([\s\S]*?)<\/channel>/g;
        let match;
        while ((match = channelBlockRegex.exec(xmlText)) !== null) {
          const id = match[1];
          const innerContent = match[2];

          if (!channelsMap.has(id)) {
            const displayMatch = /<display-name[^>]*>([^<]+)<\/display-name>/.exec(innerContent);
            const iconMatch = /<icon\s+src="([^"]+)"\s*\/>/.exec(innerContent);
            const urlMatch = /<url>([^<]+)<\/url>/.exec(innerContent);

            channelsMap.set(id, {
              id,
              displayName: displayMatch ? displayMatch[1].trim() : id,
              icon: iconMatch ? iconMatch[1] : undefined,
              url: urlMatch ? urlMatch[1].trim() : undefined,
            });
          }
        }
      }
    }
  }

  const result = Array.from(channelsMap.values());
  await setCache(CACHE_KEY, result, CACHE_TTL);
  return result;
}
