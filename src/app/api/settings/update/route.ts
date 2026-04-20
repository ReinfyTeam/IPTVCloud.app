import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const allowed = [
      'accentColor',
      'playerLayout',
      'defaultVolume',
      'autoplay',
      'performanceMode',
      'language',
      'darkMode',
      'showEpg',
    ];

    const data: Record<string, any> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const keys = Object.keys(data);
    const columns = ['id', '"userId"', ...keys.map((k) => `"${k}"`), '"updatedAt"'].join(', ');
    const placeholders = ['$1', '$2', ...keys.map((_, i) => `$${i + 3}`), 'NOW()'].join(', ');

    const updateClause = keys.map((key, i) => `"${key}" = EXCLUDED."${key}"`).join(', ');
    const upsertQuery = `
      INSERT INTO "UserSettings" (${columns})
      VALUES (${placeholders})
      ON CONFLICT ("userId") DO UPDATE SET
        ${updateClause},
        "updatedAt" = NOW()
      RETURNING *
    `;

    const { rows } = await db.query(upsertQuery, [
      crypto.randomUUID(),
      auth.user!.id,
      ...Object.values(data),
    ]);
    const settings = rows[0];

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}
