import { NextResponse } from 'next/server';
import db from '@/lib/db';
import {
  hashPassword,
  resolveRegistrationRole,
  sanitizeUser,
  signToken,
} from '@/services/auth-service';
import { rateLimit } from '@/lib/rate-limit';
import { setTokenCookie } from '@/lib/cookies';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

const EMAIL_RE = /^[a-zA-Z0-9.!#$%&'*+/=?^_`{|}~-]+@[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?(?:\.[a-zA-Z0-9](?:[a-zA-Z0-9-]{0,61}[a-zA-Z0-9])?)*$/;

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
    const firstName = body.firstName ? String(body.firstName).trim() : undefined;
    const lastName = body.lastName ? String(body.lastName).trim() : undefined;
    const middleInitial = body.middleInitial ? String(body.middleInitial).trim() : undefined;
    const suffix = body.suffix ? String(body.suffix).trim() : undefined;
    const name = [firstName, middleInitial, lastName, suffix].filter(Boolean).join(' ');

    if (!email || !password || !username || !firstName || !lastName) {
      return NextResponse.json(
        { ok: false, error: 'Email, username, password, first name and last name are required.' },
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

    const { rows: emailRows } = await db.query('SELECT id FROM "User" WHERE email = $1', [email]);
    if (emailRows.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'An account with that email already exists.' },
        { status: 409 },
      );
    }

    const { rows: userRows } = await db.query('SELECT id FROM "User" WHERE username = $1', [
      username,
    ]);
    if (userRows.length > 0) {
      return NextResponse.json(
        { ok: false, error: 'That username is already taken.' },
        { status: 409 },
      );
    }

    const hashed = await hashPassword(password);
    const id = randomUUID();
    const role = resolveRegistrationRole(email);

    const { rows } = await db.query(
      `INSERT INTO "User" (id, email, username, password, name, "firstName", "lastName", "middleInitial", suffix, role)
       VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10)
       RETURNING *`,
      [id, email, username, hashed, name, firstName, lastName, middleInitial, suffix, role],
    );
    const user = rows[0];

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
