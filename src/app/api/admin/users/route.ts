import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, hashPassword } from '@/services/auth-service';

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  let whereClause = '';
  let params: any[] = [];

  if (q) {
    whereClause = 'WHERE email ILIKE $1 OR username ILIKE $1 OR name ILIKE $1 OR id = $2';
    params = [`%${q}%`, q];
  }

  const usersQuery = `
    SELECT id, email, username, name, role, "isVerified", "suspendedAt", "isMuted", "isRestricted", "createdAt", "twoFactorEnabled"
    FROM "User"
    ${whereClause}
    ORDER BY "createdAt" DESC
    LIMIT $${params.length + 1} OFFSET $${params.length + 2}
  `;

  const countQuery = `
    SELECT COUNT(*)::int as total FROM "User" ${whereClause}
  `;

  const [usersRes, countRes] = await Promise.all([
    db.query(usersQuery, [...params, limit, skip]),
    db.query(countQuery, params),
  ]);

  return NextResponse.json({
    users: usersRes.rows,
    total: countRes.rows[0].total,
    page,
    limit,
  });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { userId, action, reason, value } = body;

  try {
    if (action === 'SUSPEND') {
      await db.query(
        'UPDATE "User" SET "suspendedAt" = $1, "suspensionReason" = $2 WHERE id = $3',
        [new Date(), reason, userId],
      );
    } else if (action === 'UNSUSPEND') {
      await db.query(
        'UPDATE "User" SET "suspendedAt" = NULL, "suspensionReason" = NULL WHERE id = $1',
        [userId],
      );
    } else if (action === 'MUTE') {
      await db.query('UPDATE "User" SET "isMuted" = $1, "muteExpiresAt" = $2 WHERE id = $3', [
        true,
        new Date(Date.now() + 24 * 60 * 60 * 1000),
        userId,
      ]);
    } else if (action === 'UNMUTE') {
      await db.query('UPDATE "User" SET "isMuted" = $1, "muteExpiresAt" = NULL WHERE id = $2', [
        false,
        userId,
      ]);
    } else if (action === 'RESTRICT') {
      await db.query('UPDATE "User" SET "isRestricted" = $1 WHERE id = $2', [true, userId]);
    } else if (action === 'UNRESTRICT') {
      await db.query('UPDATE "User" SET "isRestricted" = $1 WHERE id = $2', [false, userId]);
    } else if (action === 'SET_ROLE') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await db.query('UPDATE "User" SET role = $1 WHERE id = $2', [value, userId]);
    } else if (action === 'SET_VERIFIED') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await db.query('UPDATE "User" SET "isVerified" = $1, "verifiedAt" = $2 WHERE id = $3', [
        value,
        value ? new Date() : null,
        userId,
      ]);
    } else if (action === 'DELETE') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await db.query('DELETE FROM "User" WHERE id = $1', [userId]);
    } else if (action === 'RESET_PASSWORD') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      const newPassword = value || Math.random().toString(36).slice(-8);
      const hashedPassword = await hashPassword(newPassword);
      await db.query('UPDATE "User" SET password = $1, "forcePasswordReset" = $2 WHERE id = $3', [
        hashedPassword,
        true,
        userId,
      ]);
      return NextResponse.json({ success: true, newPassword });
    } else if (action === 'CHANGE_EMAIL') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await db.query('UPDATE "User" SET email = $1 WHERE id = $2', [value, userId]);
    } else if (action === 'CHANGE_USERNAME') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await db.query('UPDATE "User" SET username = $1 WHERE id = $2', [value, userId]);
    } else if (action === 'CHANGE_NAME') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await db.query('UPDATE "User" SET name = $1 WHERE id = $2', [value, userId]);
    } else if (action === 'RESET_2FA') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await db.query(
        'UPDATE "User" SET "twoFactorEnabled" = $1, "twoFactorSecret" = NULL WHERE id = $2',
        [false, userId],
      );
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
