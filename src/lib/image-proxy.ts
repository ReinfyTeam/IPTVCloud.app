export function getProxiedImageUrl(url?: string | null): string {
  if (!url) return '';
  if (url.startsWith('/') || url.startsWith('blob:') || url.startsWith('data:')) return url;
  return `/api/proxy-image?url=${encodeURIComponent(url)}`;
}
