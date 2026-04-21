import { isIP } from 'net';

/**
 * Validates a URL for SSRF prevention.
 * Ensures the URL is absolute, uses http/https, and does not point to local/private addresses.
 */
export function validateUrlForProxy(url: string): boolean {
  try {
    const parsed = new URL(url);

    // Only allow http and https
    if (parsed.protocol !== 'http:' && parsed.protocol !== 'https:') {
      return false;
    }

    const hostname = parsed.hostname;

    // Block localhost
    if (
      hostname === 'localhost' ||
      hostname === '0.0.0.0' ||
      hostname === '127.0.0.1' ||
      hostname === '[::1]'
    ) {
      return false;
    }

    // If it's an IP, check if it's private
    if (isIP(hostname)) {
      if (isPrivateIP(hostname)) {
        return false;
      }
    }

    // Additional checks can be added here (e.g. DNS rebinding protection)

    return true;
  } catch (e) {
    return false;
  }
}

function isPrivateIP(ip: string): boolean {
  // Simple check for private IPv4 ranges
  // 10.0.0.0 – 10.255.255.255
  // 172.16.0.0 – 172.31.255.255
  // 192.168.0.0 – 192.168.255.255
  // 169.254.0.0 - 169.254.255.255 (Link-local)

  const parts = ip.split('.').map(Number);
  if (parts.length !== 4) return false;

  if (parts[0] === 10) return true;
  if (parts[0] === 172 && parts[1] >= 16 && parts[1] <= 31) return true;
  if (parts[0] === 192 && parts[1] === 168) return true;
  if (parts[0] === 169 && parts[1] === 254) return true;

  return false;
}
