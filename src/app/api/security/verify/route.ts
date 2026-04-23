import { NextRequest, NextResponse } from 'next/server';
import { generateClearanceToken, CLEARANCE_COOKIE_CONFIG } from '@/lib/security';
import { verifyChallengeToken } from '@/lib/challenges';

export const dynamic = 'force-dynamic';

/**
 * API route to verify browser challenge and issue security token
 */
export async function POST(req: NextRequest) {
  try {
    const { solution, token, ...fingerprint } = await req.json();
    const ua = req.headers.get('user-agent') || 'unknown';
    const ip = req.headers.get('x-forwarded-for')?.split(',')[0] || '127.0.0.1';

    // 1. Basic Fingerprint Validation
    if (!fingerprint.timezone || !fingerprint.screen || !fingerprint.language) {
      return NextResponse.json({ ok: false, error: 'Invalid fingerprint' }, { status: 400 });
    }

    // 2. Challenge Verification
    if (!token || !solution) {
      return NextResponse.json({ ok: false, error: 'Challenge required' }, { status: 400 });
    }

    const isHuman = await verifyChallengeToken(token, solution);
    if (!isHuman) {
      return NextResponse.json({ ok: false, error: 'Verification failed' }, { status: 400 });
    }

    // 3. Anti-Bot: Instant Solve Check
    // We check the timestamp in the token (expiry - duration)
    const [, expiryStr] = token.split('.');
    const startTime = parseInt(expiryStr, 10) - 1000 * 60 * 5;
    const duration = Date.now() - startTime;

    if (duration < 1500) {
      // < 1.5 seconds is suspicious
      return NextResponse.json({ ok: false, error: 'Solving too fast' }, { status: 403 });
    }

    // 4. Generate secure HMAC-signed token
    const clearanceValue = await generateClearanceToken(ip, ua);

    // 5. Prepare response with secure cookie
    const response = NextResponse.json({
      ok: true,
      message: 'Verified successfully',
      ray_id: Math.random().toString(36).substring(2, 10).toUpperCase(),
    });

    // 6. Set the security cookie
    response.cookies.set(CLEARANCE_COOKIE_CONFIG.name, clearanceValue, {
      ...CLEARANCE_COOKIE_CONFIG,
      secure: process.env.NODE_ENV === 'production',
    });

    return response;
  } catch (error) {
    console.error('Security verify API error:', error);
    return NextResponse.json({ ok: false, error: 'Internal security error' }, { status: 500 });
  }
}
