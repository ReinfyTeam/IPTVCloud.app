import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { hashPassword, resolveRegistrationRole, sanitizeUser, signToken } from '@/services/auth-service';

export async function POST(req: Request) {
  try {
    const body = await req.json();
    const { email, password, name } = body;

    if (!email || !password) {
      return NextResponse.json({ ok: false, error: 'Missing email or password' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });

    if (existing) {
      return NextResponse.json({ ok: false, error: 'User exists' }, { status: 400 });
    }

    const hashed = await hashPassword(password);
    const normalizedEmail = String(email).trim().toLowerCase();
    const user = await prisma.user.create({
      data: {
        email: normalizedEmail,
        password: hashed,
        name,
        role: resolveRegistrationRole(normalizedEmail),
      },
    });
    const token = signToken(user);

    return NextResponse.json({ ok: true, user: sanitizeUser(user), token });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
