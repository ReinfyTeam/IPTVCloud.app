import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const userResult = await db.query('SELECT * FROM "User" WHERE id = $1', [auth.user!.id]);
    const user = userResult.rows[0];

    if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });

    const settingsResult = await db.query('SELECT * FROM "UserSettings" WHERE "userId" = $1', [
      auth.user!.id,
    ]);
    const favoritesCountResult = await db.query(
      'SELECT COUNT(*) FROM "Favorite" WHERE "userId" = $1',
      [auth.user!.id],
    );
    const historyCountResult = await db.query(
      'SELECT COUNT(*) FROM "WatchHistory" WHERE "userId" = $1',
      [auth.user!.id],
    );

    return NextResponse.json({
      ok: true,
      user: {
        ...sanitizeUser(user),
        settings: settingsResult.rows[0],
        stats: {
          favorites: parseInt(favoritesCountResult.rows[0].count),
          watchHistory: parseInt(historyCountResult.rows[0].count),
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;

    if (name === undefined) {
      return NextResponse.json({ ok: true, user: sanitizeUser(auth.user!) });
    }

    const updatedResult = await db.query(
      'UPDATE "User" SET name = $1, "updatedAt" = NOW() WHERE id = $2 RETURNING *',
      [name, auth.user!.id],
    );

    return NextResponse.json({ ok: true, user: sanitizeUser(updatedResult.rows[0]) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 500 },
    );
  }
}
