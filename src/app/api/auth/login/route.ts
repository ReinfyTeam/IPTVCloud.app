import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuspended, sanitizeUser, signToken, verifyPassword } from '@/services/auth-service';
import { rateLimit } from '@/lib/rate-limit';
import { setTokenCookie } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const rl = rateLimit(`login:${ip}`, { windowMs: 15 * 60_000, max: 10 });
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: 'Too many login attempts. Try again later.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');

    if (!email || !password) {
      return NextResponse.json(
        { ok: false, error: 'Email and password are required.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user || !(await verifyPassword(password, user.password))) {
      return NextResponse.json({ ok: false, error: 'Invalid email or password.' }, { status: 401 });
    }

    if (isSuspended(user)) {
      return NextResponse.json(
        { ok: false, error: user.suspensionReason || 'This account has been suspended.' },
        { status: 403 },
      );
    }

    if (user.twoFactorEnabled) {
      return NextResponse.json({ ok: true, twoFactorRequired: true, userId: user.id });
    }

    const token = signToken(user);
    const response = NextResponse.json({ ok: true, user: sanitizeUser(user), token });
    return setTokenCookie(response, token);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Login failed.' },
      { status: 500 },
    );
  }
}
