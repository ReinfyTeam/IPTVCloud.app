import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { isSuspended, sanitizeUser, signToken, verifyPassword } from '@/services/auth-service';

export async function POST(req: Request) {
  try {
    const { email, password } = await req.json();

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Missing email or password' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { email } });

    if (!user) {
      return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
    }

    const isValid = await verifyPassword(password, user.password);
    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid credentials' }, { status: 401 });
    }

    if (isSuspended(user)) {
      return NextResponse.json(
        { ok: false, error: user.suspensionReason || 'Account suspended' },
        { status: 403 },
      );
    }

    return NextResponse.json({ ok: true, user: sanitizeUser(user), token: signToken(user) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
