/* eslint-disable */
import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { sanitizeUser, signToken } from '@/services/auth-service';
import { setTokenCookie } from '@/lib/cookies';

// Using require for otplib to ensure compatibility in Next.js environment
const { authenticator } = require('otplib');

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const { userId, token } = await req.json();

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user || !user.twoFactorSecret) {
      return NextResponse.json(
        { ok: false, error: 'User not found or 2FA not enabled.' },
        { status: 404 },
      );
    }

    const isValid = authenticator.verify({ token, secret: user.twoFactorSecret });
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid verification code.' }, { status: 400 });
    }

    const authToken = signToken(user);
    const response = NextResponse.json({ ok: true, user: sanitizeUser(user), token: authToken });
    return setTokenCookie(response, authToken);
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Verification failed.' }, { status: 500 });
  }
}
