import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { email } = await req.json();
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 });
    }

    const existingResult = await db.query('SELECT id FROM "User" WHERE email = $1', [cleanEmail]);
    const existing = existingResult.rows[0];
    if (existing && existing.id !== auth.user!.id) {
      return NextResponse.json({ ok: false, error: 'Email already in use.' }, { status: 409 });
    }

    const updatedResult = await db.query('UPDATE "User" SET email = $1 WHERE id = $2 RETURNING *', [
      cleanEmail,
      auth.user!.id,
    ]);
    const updated = updatedResult.rows[0];

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 500 },
    );
  }
}
