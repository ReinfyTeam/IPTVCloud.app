import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const updatedResult = await db.query(
      `UPDATE "User"
       SET "twoFactorSecret" = null, "twoFactorEnabled" = false, "updatedAt" = NOW()
       WHERE id = $1
       RETURNING *`,
      [auth.user!.id],
    );

    return NextResponse.json({ ok: true, user: sanitizeUser(updatedResult.rows[0]) });
  } catch (error) {
    console.error('2FA disable error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to disable 2FA.' }, { status: 500 });
  }
}
