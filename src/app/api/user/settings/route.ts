import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const result = await db.query('SELECT * FROM "UserSettings" WHERE "userId" = $1', [
      auth.user!.id,
    ]);

    return NextResponse.json({ ok: true, settings: result.rows[0] || null });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}

export async function PUT(req: Request) {
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

    // Check if settings exist
    const existing = await db.query('SELECT id FROM "UserSettings" WHERE "userId" = $1', [
      auth.user!.id,
    ]);

    let settings;
    if (existing.rows.length > 0) {
      // Update
      const keys = Object.keys(data);
      if (keys.length === 0) {
        const current = await db.query('SELECT * FROM "UserSettings" WHERE "userId" = $1', [
          auth.user!.id,
        ]);
        settings = current.rows[0];
      } else {
        const setClause = keys.map((key, i) => `"${key}" = $${i + 1}`).join(', ');
        const values = keys.map((key) => data[key]);
        const result = await db.query(
          `UPDATE "UserSettings" SET ${setClause}, "updatedAt" = NOW() WHERE "userId" = $${keys.length + 1} RETURNING *`,
          [...values, auth.user!.id],
        );
        settings = result.rows[0];
      }
    } else {
      // Insert
      const keys = ['id', 'userId', ...Object.keys(data)];
      const placeholders = keys.map((_, i) => `$${i + 1}`).join(', ');
      const columns = keys.map((k) => `"${k}"`).join(', ');
      const values = [
        crypto.randomUUID(),
        auth.user!.id,
        ...Object.keys(data).map((key) => data[key]),
      ];

      const result = await db.query(
        `INSERT INTO "UserSettings" (${columns}) VALUES (${placeholders}) RETURNING *`,
        values,
      );
      settings = result.rows[0];
    }

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    console.error('UserSettings PUT error:', error);
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}
