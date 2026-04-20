import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, hasAdminRole, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireAdmin: true });
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const userId = String(body.userId || '');
    const suspended = Boolean(body.suspended);
    const reason = typeof body.reason === 'string' ? body.reason.trim() : null;

    if (!userId) {
      return NextResponse.json({ ok: false, error: 'Missing userId' }, { status: 400 });
    }

    const targetUserRes = await db.query('SELECT * FROM "User" WHERE id = $1', [userId]);
    const targetUser = targetUserRes.rows[0];

    if (!targetUser) {
      return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });
    }

    if (auth.user?.id === targetUser.id) {
      return NextResponse.json(
        { ok: false, error: 'Cannot suspend your own account' },
        { status: 400 },
      );
    }

    if (hasAdminRole(targetUser.role)) {
      return NextResponse.json(
        { ok: false, error: 'Cannot suspend another admin account' },
        { status: 403 },
      );
    }

    const updatedUserRes = await db.query(
      'UPDATE "User" SET "suspendedAt" = $1, "suspensionReason" = $2 WHERE id = $3 RETURNING *',
      [suspended ? new Date() : null, suspended ? reason || 'Suspended by admin' : null, userId],
    );

    return NextResponse.json({
      ok: true,
      user: sanitizeUser(updatedUserRes.rows[0]),
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
