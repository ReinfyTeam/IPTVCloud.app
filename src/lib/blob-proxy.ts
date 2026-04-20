import { encodeBase64Url, decodeBase64Url } from './base64';

export type BlobType = 'image' | 'video' | 'attachment' | 'cdn';

/**
 * Generates a proxied URL with a Base64 encoded target URL.
 */
export function getProxiedBlobUrl(
  url: string | null | undefined,
  type: BlobType = 'image',
): string {
  if (!url) return '';
  if (url.startsWith('/api/')) return url; // Already proxied or internal

  const encoded = encodeBase64Url(url);

  switch (type) {
    case 'image':
      return `/api/images/${encoded}`;
    case 'video':
      return `/api/videos/${encoded}`;
    case 'attachment':
      return `/api/attachments/${encoded}`;
    case 'cdn':
      return `/api/cdn/${encoded}`;
    default:
      return url;
  }
}

/**
 * Decodes the target URL from a proxied URL ID.
 */
export function decodeProxiedBlobUrl(id: string): string {
  return decodeBase64Url(id);
}
