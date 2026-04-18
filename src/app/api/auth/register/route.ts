import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import {
  hashPassword,
  resolveRegistrationRole,
  sanitizeUser,
  signToken,
} from '@/services/auth-service';
import { rateLimit } from '@/lib/rate-limit';
import { setTokenCookie } from '@/lib/cookies';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

export async function POST(req: Request) {
  try {
    const ip = req.headers.get('x-forwarded-for') ?? 'unknown';
    const rl = rateLimit(`register:${ip}`, { windowMs: 60 * 60_000, max: 5 });
    if (!rl.success) {
      return NextResponse.json(
        { ok: false, error: 'Too many registration attempts. Try again later.' },
        { status: 429 },
      );
    }

    const body = await req.json();
    const email = String(body.email || '')
      .trim()
      .toLowerCase();
    const username = String(body.username || '')
      .trim()
      .toLowerCase();
    const password = String(body.password || '');
    const name = body.name ? String(body.name).trim() : undefined;

    if (!email || !password || !username) {
      return NextResponse.json(
        { ok: false, error: 'Email, username and password are required.' },
        { status: 400 },
      );
    }
    if (!EMAIL_RE.test(email)) {
      return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 });
    }
    if (username.length < 3 || !/^[a-z0-9_]+$/.test(username)) {
      return NextResponse.json(
        {
          ok: false,
          error:
            'Username must be at least 3 characters and contain only letters, numbers, and underscores.',
        },
        { status: 400 },
      );
    }
    if (password.length < 8) {
      return NextResponse.json(
        { ok: false, error: 'Password must be at least 8 characters.' },
        { status: 400 },
      );
    }

    const existingEmail = await prisma.user.findUnique({ where: { email } });
    if (existingEmail) {
      return NextResponse.json(
        { ok: false, error: 'An account with that email already exists.' },
        { status: 409 },
      );
    }

    const existingUser = await prisma.user.findUnique({ where: { username } });
    if (existingUser) {
      return NextResponse.json(
        { ok: false, error: 'That username is already taken.' },
        { status: 409 },
      );
    }

    const hashed = await hashPassword(password);
    const user = await prisma.user.create({
      data: {
        email,
        username,
        password: hashed,
        name,
        role: resolveRegistrationRole(email),
      },
    });

    const token = signToken(user);
    const response = NextResponse.json({ ok: true, user: sanitizeUser(user), token });
    return setTokenCookie(response, token);
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Registration failed.' },
      { status: 500 },
    );
  }
}
