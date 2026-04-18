import xml2js from 'xml2js';
import type { EpgLookupResult, EpgProgram } from '@/types';

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
    const res = await fetch(
      `https://en.wikipedia.org/api/rest_v1/page/summary/${encodeURIComponent(cleanTitle)}`,
      {
        headers: { 'User-Agent': 'IPTVCloud.app/1.0' },
        next: { revalidate: 86400 }, // cache aggressively for 24h
      },
    );
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

export async function fetchEpgForId(
  epgId: string,
  preferredSourceUrl?: string,
): Promise<EpgLookupResult> {
  const bases = [
    preferredSourceUrl,
    process.env.EPG_BASE_URL?.replace(/\/$/, ''),
    'https://iptv-org.github.io/epg',
    'https://raw.githubusercontent.com/iptv-org/epg/master',
  ].filter(Boolean) as string[];

  const names = epgId.endsWith('.xml') ? [epgId] : [`${epgId}.xml`, epgId];

  let xmlText: string | null = null;
  let sourceUrl: string | null = null;

  for (const base of bases) {
    if (base === preferredSourceUrl) {
      try {
        const response = await fetch(base, { next: { revalidate: 3600 } });
        if (response.ok) {
          xmlText = await response.text();
          sourceUrl = base;
          break;
        }
      } catch {}
      continue;
    }

    for (const name of names) {
      const url = `${base}/${name}`;
      try {
        const response = await fetch(url, { next: { revalidate: 3600 } });
        if (!response.ok) continue;

        xmlText = await response.text();
        sourceUrl = url;
        break;
      } catch {
        // Try the next candidate.
      }
    }

    if (xmlText) break;
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
      // Strictly filter by channel ID
      const progChannelId = program.channel || '';
      if (progChannelId !== epgId && !epgId.startsWith(progChannelId)) continue;

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
  } catch (error) {
    return {
      found: true,
      url: sourceUrl,
      error: error instanceof Error ? error.message : String(error),
      raw: xmlText.slice(0, 16 * 1024),
    };
  }
}
