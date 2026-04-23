import { NextRequest, NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

/**
 * GET /api/admin/security
 * Fetch current security settings
 */
export async function GET(req: NextRequest) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const result = await db.query(
      "SELECT key, value FROM \"GlobalSetting\" WHERE key IN ('SECURITY_LEVEL', 'CHALLENGE_TYPES')",
    );
    const settings = result.rows.reduce((acc: any, row) => {
      acc[row.key] = row.value;
      return acc;
    }, {});

    return NextResponse.json({
      level: settings.SECURITY_LEVEL || 'MEDIUM',
      challenges: (settings.CHALLENGE_TYPES || 'IMAGE,TEXT,MATH,CLICK').split(','),
    });
  } catch (error) {
    console.error('Error fetching security settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}

/**
 * POST /api/admin/security
 * Update security settings
 */
export async function POST(req: NextRequest) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;
  if (!auth.isAdmin) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  try {
    const { level, challenges } = await req.json();

    if (level) {
      await db.query(
        'INSERT INTO "GlobalSetting" (key, value, "updatedAt") VALUES (\'SECURITY_LEVEL\', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()',
        [level],
      );
    }

    if (Array.isArray(challenges)) {
      await db.query(
        'INSERT INTO "GlobalSetting" (key, value, "updatedAt") VALUES (\'CHALLENGE_TYPES\', $1, NOW()) ON CONFLICT (key) DO UPDATE SET value = $1, "updatedAt" = NOW()',
        [challenges.join(',')],
      );
    }

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Error updating security settings:', error);
    return NextResponse.json({ error: 'Internal server error' }, { status: 500 });
  }
}
