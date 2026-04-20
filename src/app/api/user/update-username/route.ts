import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { username } = await req.json();
    const cleanUsername = String(username || '')
      .trim()
      .toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3 || !/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json({ ok: false, error: 'Invalid username format.' }, { status: 400 });
    }

    const userResult = await db.query('SELECT * FROM "User" WHERE id = $1', [auth.user!.id]);
    const user = userResult.rows[0];
    if (!user) return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });

    // Check 3 months logic
    if (user.lastUsernameChange) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (new Date(user.lastUsernameChange) > threeMonthsAgo) {
        const nextDate = new Date(user.lastUsernameChange);
        nextDate.setMonth(nextDate.getMonth() + 3);
        return NextResponse.json(
          {
            ok: false,
            error: `Username can only be changed once every 3 months. Next change available after ${nextDate.toLocaleDateString()}.`,
          },
          { status: 403 },
        );
      }
    }

    // Check availability
    const takenResult = await db.query('SELECT id FROM "User" WHERE username = $1', [
      cleanUsername,
    ]);
    const taken = takenResult.rows[0];
    if (taken && taken.id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'That username is already taken.' },
        { status: 409 },
      );
    }

    const updatedResult = await db.query(
      'UPDATE "User" SET username = $1, "lastUsernameChange" = $2 WHERE id = $3 RETURNING *',
      [cleanUsername, new Date(), user.id],
    );
    const updated = updatedResult.rows[0];

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 500 },
    );
  }
}
