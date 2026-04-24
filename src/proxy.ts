import { NextRequest, NextResponse } from 'next/server';
import {
  assessRisk,
  verifySecurityToken,
  generateClearanceToken,
  CLEARANCE_COOKIE_CONFIG,
} from '@/lib/security';

// Helper function to set security headers
function setSecurityHeaders(response: NextResponse): NextResponse {
  // Content Security Policy (CSP)
  // This is a strict policy. You might need to adjust it based on your application's needs.
  const csp = `
    default-src 'self';
    script-src 'self' 'unsafe-eval' 'unsafe-inline' https://www.googletagmanager.com https://www.google-analytics.com;
    style-src 'self' 'unsafe-inline' https://fonts.googleapis.com;
    img-src 'self' data: https://*.githubusercontent.com https://i.imgur.com https://cdn.jsdelivr.net;
    font-src 'self' https://fonts.gstatic.com;
    connect-src 'self' https://*.google-analytics.com;
    frame-ancestors 'none';
    form-action 'self';
    base-uri 'self';
    object-src 'none';
    upgrade-insecure-requests;
  `;

  response.headers.set('Content-Security-Policy', csp.replace(/\s{2,}/g, ' ').trim());
  response.headers.set('X-Content-Type-Options', 'nosniff');
  response.headers.set('X-Frame-Options', 'DENY');
  response.headers.set('Referrer-Policy', 'strict-origin-when-cross-origin');
  response.headers.set('Permissions-Policy', 'camera=(), microphone=(), geolocation=()');

  // HSTS (Strict-Transport-Security) is typically set by your hosting provider or a reverse proxy like Cloudflare/NGINX.
  // If not, you can enable it here. Be careful as it forces HTTPS for a long time.
  // response.headers.set('Strict-Transport-Security', 'max-age=63072000; includeSubDomains; preload');

  return response;
}

/**
 * Middleware security gate to protect against bots and DDoS
 */
export async function proxy(req: NextRequest) {
  const { pathname, search } = req.nextUrl;

  // 1. Skip security check for internal, static, and security-related routes
  if (
    pathname.startsWith('/_next') ||
    pathname.startsWith('/static') ||
    pathname.startsWith('/api/security') ||
    pathname === '/security-check' ||
    pathname.match(/\.(ico|png|jpg|jpeg|svg|css|js|webp)$/)
  ) {
    return setSecurityHeaders(NextResponse.next());
  }

  // 2. Check if browser is already verified via signed cookie
  const isVerified = await verifySecurityToken(req);
  if (isVerified) {
    return setSecurityHeaders(NextResponse.next());
  }

  // 3. Assess risk for unverified requests
  const risk = await assessRisk(req);

  // If browser is verified, issue cookie and proceed
  if (risk.action === 'BROWSER_VERIFIED') {
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';
    const ua = req.headers.get('user-agent') || 'unknown';
    const clearanceValue = await generateClearanceToken(ip, ua);

    const response = NextResponse.next();
    response.cookies.set(CLEARANCE_COOKIE_CONFIG.name, clearanceValue, {
      ...CLEARANCE_COOKIE_CONFIG,
      secure: process.env.NODE_ENV === 'production',
    });
    return setSecurityHeaders(response);
  }

  // 4. Perform action based on risk score
  if (risk.action === 'BLOCK') {
    const originalUrl = encodeURIComponent(`${pathname}${search}`);
    const challengeUrl = new URL(`/security-check?from=${originalUrl}&violation=1`, req.url);
    return setSecurityHeaders(NextResponse.redirect(challengeUrl));
  }

  if (risk.action === 'CHALLENGE') {
    // Redirect to challenge page, preserving the original URL
    const originalUrl = encodeURIComponent(`${pathname}${search}`);
    const challengeUrl = new URL(`/security-check?from=${originalUrl}`, req.url);

    return setSecurityHeaders(NextResponse.redirect(challengeUrl));
  }

  // ALLOW case
  return setSecurityHeaders(NextResponse.next());
}

/**
 * Match all paths except static assets
 */
export const config = {
  matcher: ['/((?!api/auth|api/ping|_next/static|_next/image|favicon.ico).*)'],
};
