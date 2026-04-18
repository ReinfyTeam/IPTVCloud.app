import crypto from 'crypto';
import type { Channel } from '@/types';

export function generateId(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

export function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /([a-zA-Z][a-zA-Z0-9_-]*)="([^"]*?)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    attrs[m[1].toLowerCase()] = m[2];
  }
  return attrs;
}

export function parseM3U(content: string): { channels: Channel[]; epgUrl?: string } {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  let epgUrl: string | undefined;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;

    if (line.startsWith('#EXTM3U')) {
      const attrs = parseAttributes(line);
      epgUrl = attrs['url-tvg'] || attrs['x-tvg-url'];
      continue;
    }

    if (line.startsWith('#EXTINF')) {
      const commaIdx = line.indexOf(',');
      const displayName = commaIdx !== -1 ? line.slice(commaIdx + 1).trim() : '';
      const meta = commaIdx !== -1 ? line.slice(0, commaIdx) : line;
      const attrs = parseAttributes(meta);
      // find next URL
      let url = '';
      let j = i + 1;
      while (j < lines.length) {
        const candidate = lines[j].trim();
        if (candidate && !candidate.startsWith('#')) {
          url = candidate;
          break;
        }
        j++;
      }
      if (!url) {
        i = j;
        continue;
      }

      const epgId = attrs['tvg-id'] || attrs['id'] || undefined;
      const logo = attrs['tvg-logo'] || attrs['logo'] || undefined;
      // iptv-org uses semicolons for multi-category — take first
      const rawCategory = attrs['group-title'] || attrs['group'] || undefined;
      let category = rawCategory ? rawCategory.split(';')[0].trim() || undefined : undefined;
      if (!category || /^(undefined|unknown)$/i.test(category)) {
        category = 'Uncategorized';
      }
      const language = attrs['tvg-language'] || attrs['language'] || undefined;
      // Extract country from tvg-country attr, or decode from tvg-id (format: ChannelName.CC@Quality)
      let country = attrs['tvg-country'] || attrs['country'] || undefined;
      if (!country && epgId) {
        const m = epgId.match(/\.([a-z]{2,3})(?:@|$)/i);
        if (m) country = m[1].toLowerCase();
      }
      if (!country || /^(undefined|unknown)$/i.test(country)) {
        country = 'International';
      }

      const nameRaw = displayName || attrs['tvg-name'] || attrs['title'] || url;
      // Resolution extraction logic
      const resMatch = nameRaw.match(/\b(4K|2160p|1080p|720p|576p|480p|FHD|HD|SD)\b/i);
      const resolution = resMatch ? resMatch[1].toUpperCase() : undefined;

      // Clean name: remove resolution tags from display name
      const name = nameRaw.replace(/\b(4K|2160p|1080p|720p|576p|480p|FHD|HD|SD)\b/gi, '').trim();

      const id = generateId(url + nameRaw);

      channels.push({
        id,
        name,
        logo,
        country,
        language,
        category,
        resolution,
        streamUrl: url,
        epgId,
        isLive: true,
        fallbackUrls: [],
      });

      i = j;
    }
  }
  return { channels, epgUrl };
}

export default parseM3U;
