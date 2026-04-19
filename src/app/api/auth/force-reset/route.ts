import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, verifyPassword, sanitizeUser, signToken } from '@/services/auth-service';
import { setTokenCookie } from '@/lib/cookies';
import { rateLimit } from '@/lib/rate-limit';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const rl = rateLimit(`force_reset:${ip}`, { windowMs: 15 * 60_000, max: 10 });
    if (!rl.success) {
      return NextResponse.json({ ok: false, error: 'Too many attempts.' }, { status: 429 });
    }

    const { userId, oldPassword, newPassword } = await req.json();

    if (!userId || !oldPassword || !newPassword || newPassword.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Invalid input. New password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const user = await prisma.user.findUnique({ where: { id: userId } });
    if (!user) {
      return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });
    }

    if (!user.forcePasswordReset) {
      return NextResponse.json(
        { ok: false, error: 'Password reset is not forced for this account.' },
        { status: 400 },
      );
    }

    if (!(await verifyPassword(oldPassword, user.password))) {
      return NextResponse.json({ ok: false, error: 'Invalid current password.' }, { status: 401 });
    }

    const hashedPassword = await hashPassword(newPassword);

    const updatedUser = await prisma.user.update({
      where: { id: userId },
      data: {
        password: hashedPassword,
        forcePasswordReset: false,
      },
    });

    if (updatedUser.twoFactorEnabled) {
      return NextResponse.json({ ok: true, twoFactorRequired: true, userId: updatedUser.id });
    }

    const token = signToken(updatedUser);
    const response = NextResponse.json({ ok: true, user: sanitizeUser(updatedUser), token });
    return setTokenCookie(response, token);
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to reset password.' }, { status: 500 });
  }
}
