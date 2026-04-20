import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const result = await db.query(
      'SELECT * FROM "WatchHistory" WHERE "userId" = $1 ORDER BY "watchedAt" DESC LIMIT 50',
      [auth.user!.id],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('WatchHistory GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
