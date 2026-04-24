import DOMPurify from 'isomorphic-dompurify';

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

/**
 * Sanitizes Markdown/HTML content to prevent XSS attacks.
 * Uses isomorphic-dompurify.
 */
export function sanitizeMarkdown(markdown: string): string {
  // Allow a very limited set of HTML tags that are common in Markdown
  // This helps prevent XSS while allowing basic formatting.
  return DOMPurify.sanitize(markdown, {
    USE_PROFILES: { html: true }, // Allow basic HTML
    FORBID_TAGS: ['script', 'iframe', 'object', 'embed'], // Explicitly forbid dangerous tags
    FORBID_ATTR: ['onerror', 'onload', 'onmouseover'], // Explicitly forbid dangerous attributes
    ALLOW_DATA_ATTR: false, // Disallow data- attributes
  });
}
