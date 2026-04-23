import { NextRequest, NextResponse } from 'next/server';
import { assessRisk, verifySecurityToken } from '@/lib/security';

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
    return NextResponse.next();
  }

  // 2. Check if browser is already verified via signed cookie
  const isVerified = await verifySecurityToken(req);
  if (isVerified) {
    return NextResponse.next();
  }

  // 3. Assess risk for unverified requests
  const risk = await assessRisk(req);

  // 4. Perform action based on risk score
  if (risk.action === 'BLOCK') {
    return new NextResponse(
      JSON.stringify({
        error: 'Forbidden',
        message: 'Security policy violation detected.',
        ray_id: Math.random().toString(36).substring(2, 10).toUpperCase(),
        reasons: process.env.NODE_ENV === 'development' ? risk.reasons : undefined,
      }),
      { status: 403, headers: { 'Content-Type': 'application/json' } },
    );
  }

  if (risk.action === 'CHALLENGE') {
    // Redirect to challenge page, preserving the original URL
    const originalUrl = encodeURIComponent(`${pathname}${search}`);
    const challengeUrl = new URL(`/security-check?from=${originalUrl}`, req.url);

    return NextResponse.redirect(challengeUrl);
  }

  // ALLOW case
  return NextResponse.next();
}

/**
 * Match all paths except static assets
 */
export const config = {
  matcher: ['/((?!api/auth|api/ping|_next/static|_next/image|favicon.ico).*)'],
};
