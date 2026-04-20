import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    const { rows: favs } = await db.query(
      'SELECT * FROM "Favorite" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [auth.user!.id],
    );
    return NextResponse.json({ ok: true, favorites: favs });
  } catch (e: any) {
    console.error('favorites GET error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    const { channelId } = await req.json();
    if (!channelId)
      return NextResponse.json({ ok: false, error: 'Missing channelId' }, { status: 400 });
    // avoid duplicates
    const { rows: existsRows } = await db.query(
      'SELECT * FROM "Favorite" WHERE "userId" = $1 AND "channelId" = $2 LIMIT 1',
      [auth.user!.id, channelId],
    );
    const exists = existsRows[0];
    if (exists) return NextResponse.json({ ok: true, favorite: exists });

    const id = randomUUID();
    const { rows } = await db.query(
      'INSERT INTO "Favorite" (id, "userId", "channelId") VALUES ($1, $2, $3) RETURNING *',
      [id, auth.user!.id, channelId],
    );
    const f = rows[0];
    return NextResponse.json({ ok: true, favorite: f });
  } catch (e: any) {
    console.error('favorites POST error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    const { channelId } = await req.json();
    if (!channelId)
      return NextResponse.json({ ok: false, error: 'Missing channelId' }, { status: 400 });
    await db.query('DELETE FROM "Favorite" WHERE "userId" = $1 AND "channelId" = $2', [
      auth.user!.id,
      channelId,
    ]);
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('favorites DELETE error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
