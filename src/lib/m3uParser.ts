import crypto from 'crypto';
import type { Channel } from '@/types';

export function generateId(input: string): string {
  return crypto.createHash('sha1').update(input).digest('hex');
}

export function parseAttributes(input: string): Record<string, string> {
  const attrs: Record<string, string> = {};
  const re = /(\w+?)="([^"]*?)"/g;
  let m: RegExpExecArray | null;
  while ((m = re.exec(input)) !== null) {
    attrs[m[1]] = m[2];
  }
  return attrs;
}

export function parseM3U(content: string): Channel[] {
  const lines = content.split(/\r?\n/);
  const channels: Channel[] = [];
  for (let i = 0; i < lines.length; i++) {
    const line = lines[i].trim();
    if (!line) continue;
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
      if (!url) { i = j; continue; }

      const epgId = attrs['tvg-id'] || attrs['id'] || undefined;
      const logo = attrs['tvg-logo'] || attrs['logo'] || undefined;
      const category = attrs['group-title'] || attrs['group'] || undefined;
      const language = attrs['language'] || attrs['tvg-language'] || undefined;
      const country = attrs['country'] || undefined;
      const name = displayName || attrs['tvg-name'] || attrs['title'] || url;
      const id = epgId || generateId(url + name);

      channels.push({
        id,
        name,
        logo,
        country,
        language,
        category,
        streamUrl: url,
        epgId,
        isLive: true,
        fallbackUrls: []
      });

      i = j;
    }
  }
  return channels;
}

export default parseM3U;
