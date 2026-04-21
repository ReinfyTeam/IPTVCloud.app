/**
 * Sanitizes a URL to prevent javascript: or other malicious schemes.
 */
export function sanitizeUrl(url: string | null | undefined): string {
  if (!url) return '';
  const trimmed = url.trim();

  // Allow relative URLs starting with /
  if (trimmed.startsWith('/') && !trimmed.startsWith('//')) {
    return trimmed;
  }

  // Allow only http and https protocols
  if (/^https?:\/\//i.test(trimmed)) {
    return trimmed;
  }

  // Otherwise, return an empty string or a safe fallback
  return '';
}
