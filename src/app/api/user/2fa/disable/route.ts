import { NextResponse } from 'next/server';
import { getUserFromRequest, sanitizeUser } from '@/services/auth-service';
import db from '@/lib/db';

export async function POST(req: Request) {
  try {
    const user = await getUserFromRequest(req);
    if (!user) {
      return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
    }

    if (!user.twoFactorEnabled) {
      return NextResponse.json({ ok: false, error: '2FA is not enabled.' }, { status: 400 });
    }

    await db.query(
      'UPDATE "User" SET "twoFactorEnabled" = false, "twoFactorSecret" = NULL WHERE id = $1',
      [user.id],
    );

    const { rows } = await db.query('SELECT * FROM "User" WHERE id = $1', [user.id]);
    const updatedUser = rows[0];

    return NextResponse.json({ ok: true, user: sanitizeUser(updatedUser) });
  } catch (error: any) {
    return NextResponse.json(
      { ok: false, error: error.message || 'Failed to disable 2FA.' },
      { status: 500 },
    );
  }
}
