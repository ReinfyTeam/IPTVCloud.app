/**
 * Encodes a string to a base64url format suitable for routing and APIs.
 */
export function encodeBase64Url(str: string): string {
  let base64;
  if (typeof window !== 'undefined') {
    base64 = btoa(unescape(encodeURIComponent(str)));
  } else {
    base64 = Buffer.from(str).toString('base64');
  }
  return base64.replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
}

/**
 * Decodes a base64url string back to its original value.
 */
export function decodeBase64Url(str: string): string {
  try {
    let base64 = str.replace(/-/g, '+').replace(/_/g, '/');
    while (base64.length % 4) {
      base64 += '=';
    }
    if (typeof window !== 'undefined') {
      return decodeURIComponent(escape(atob(base64)));
    } else {
      return Buffer.from(base64, 'base64').toString('utf8');
    }
  } catch (e) {
    return str; // Fallback
  }
}
