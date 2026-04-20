import { getProxiedBlobUrl } from './blob-proxy';

export function getProxiedImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/api/')) return url;
  if (url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) return url;

  // If it's a known Vercel Blob URL (e.g. from an upload), use 'image' type proxy
  if (url.includes('.public.blob.vercel-storage.com')) {
    return getProxiedBlobUrl(url, 'image');
  }

  // For other external URLs (flags, icons), use 'cdn' type proxy
  return getProxiedBlobUrl(url, 'cdn');
}
