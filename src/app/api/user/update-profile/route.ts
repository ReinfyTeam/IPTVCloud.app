import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export async function POST(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const body = await req.json();
    const { bio, about, privacySettings, profileIcon, profileIconUrl } = body;

    const updates = [];
    const values = [];
    let i = 1;

    if (typeof bio === 'string') {
      updates.push(`"bio" = $${i++}`);
      values.push(bio);
    }
    if (typeof about === 'string') {
      updates.push(`"about" = $${i++}`);
      values.push(about);
    }
    if (typeof profileIcon === 'string') {
      updates.push(`"profileIcon" = $${i++}`);
      values.push(profileIcon);
    }
    if (typeof profileIconUrl === 'string') {
      updates.push(`"profileIconUrl" = $${i++}`);
      values.push(profileIconUrl);
    }
    if (privacySettings) {
      updates.push(`"privacySettings" = $${i++}`);
      values.push(JSON.stringify(privacySettings));
    }

    if (updates.length === 0) {
      const userResult = await db.query('SELECT * FROM "User" WHERE id = $1', [auth.user!.id]);
      return NextResponse.json({ ok: true, user: sanitizeUser(userResult.rows[0]) });
    }

    values.push(auth.user!.id);
    const updatedResult = await db.query(
      `UPDATE "User" SET ${updates.join(', ')} WHERE id = $${i} RETURNING *`,
      values,
    );
    const updatedUser = updatedResult.rows[0];

    return NextResponse.json({ ok: true, user: sanitizeUser(updatedUser) });
  } catch (error) {
    console.error('Update profile error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to update profile' }, { status: 500 });
  }
}
