import xml2js from 'xml2js';
import type { EpgLookupResult } from '@/types';

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

function simplifyProgram(program: any) {
  if (!program) return null;

  return {
    start: parseXmlDate(program.start)?.toISOString() || null,
    stop: parseXmlDate(program.stop)?.toISOString() || null,
    title: typeof program.title === 'string' ? program.title : program.title?._ || '',
    desc: typeof program.desc === 'string' ? program.desc : program.desc?._ || '',
  };
}

export async function fetchEpgForId(epgId: string): Promise<EpgLookupResult> {
  const bases = [
    process.env.EPG_BASE_URL?.replace(/\/$/, ''),
    'https://iptv-org.github.io/epg',
    'https://raw.githubusercontent.com/iptv-org/epg/master',
  ].filter(Boolean) as string[];

  const names = epgId.endsWith('.xml') ? [epgId] : [`${epgId}.xml`, epgId];

  let xmlText: string | null = null;
  let sourceUrl: string | null = null;

  for (const base of bases) {
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

    for (const program of programmes) {
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
      now: simplifyProgram(currentProgram),
      next: simplifyProgram(nextProgram),
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
