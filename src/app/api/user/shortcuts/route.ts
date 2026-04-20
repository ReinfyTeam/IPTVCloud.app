import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export async function GET(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const result = await db.query('SELECT * FROM "CustomShortcut" WHERE "userId" = $1', [user.id]);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch shortcuts error:', error);
    return NextResponse.json({ error: 'Failed to fetch shortcuts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, key } = await req.json();

    if (!action || !key) {
      return NextResponse.json({ error: 'Missing action or key' }, { status: 400 });
    }

    const result = await db.query(
      `INSERT INTO "CustomShortcut" ("userId", "action", "key")
       VALUES ($1, $2, $3)
       ON CONFLICT ("userId", "action") DO UPDATE SET "key" = EXCLUDED."key"
       RETURNING *`,
      [user.id, action, key],
    );

    return NextResponse.json(result.rows[0]);
  } catch (error) {
    console.error('Save shortcut error:', error);
    return NextResponse.json({ error: 'Failed to save shortcut' }, { status: 500 });
  }
}
