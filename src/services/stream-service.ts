import { encodeBase64Url } from '@/lib/base64';

const STREAM_PROXY_BASE = '/api/streams';

export function isHttpUrl(value: string) {
  return /^https?:\/\//i.test(value);
}

export async function buildStreamProxyUrl(value: string) {
  const key = encodeBase64Url(value);
  return `${STREAM_PROXY_BASE}/${key}`;
}

export function absolutizeUrl(value: string, baseUrl: string) {
  try {
    return new URL(value, baseUrl).toString();
  } catch {
    return value;
  }
}

export function isLikelyHlsManifest(url: string, contentType?: string | null, body?: string) {
  const normalizedType = String(contentType || '').toLowerCase();
  if (
    normalizedType.includes('application/vnd.apple.mpegurl') ||
    normalizedType.includes('application/x-mpegurl')
  )
    return true;
  if (url.toLowerCase().includes('.m3u8')) return true;
  return typeof body === 'string' && body.trimStart().startsWith('#EXTM3U');
}

export async function rewriteHlsManifest(manifest: string, manifestUrl: string) {
  const lines = manifest.split(/\r?\n/);
  const newLines = await Promise.all(
    lines.map(async (line) => {
      const trimmed = line.trim();
      if (!trimmed || trimmed.startsWith('#')) {
        if (trimmed.startsWith('#EXT-X-STREAM-INF') || trimmed.startsWith('#EXT-X-MEDIA')) {
          const match = /URI="([^"]+)"/.exec(line);
          if (match) {
            const proxyUrl = await buildStreamProxyUrl(absolutizeUrl(match[1], manifestUrl));
            return line.replace(/URI="([^"]+)"/, `URI="${proxyUrl}"`);
          }
        }
        return line;
      }
      return await buildStreamProxyUrl(absolutizeUrl(trimmed, manifestUrl));
    }),
  );
  return newLines.join('\n');
}
