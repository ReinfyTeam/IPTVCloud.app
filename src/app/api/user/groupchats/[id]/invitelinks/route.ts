import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { expiresAt } = await req.json();
    const groupId = (await params).id;

    // Only admins can create invite links
    const { rows: requesterRows } = await db.query(
      'SELECT 1 FROM "GroupChatMember" WHERE "groupChatId" = $1 AND "userId" = $2 AND "isAdmin" = true',
      [groupId, auth.user!.id],
    );
    if (requesterRows.length === 0)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const code = crypto.randomBytes(4).toString('hex').toUpperCase(); // 8 char code
    const id = crypto.randomUUID();

    await db.query(
      'INSERT INTO "GroupInviteLink" (id, "groupChatId", "code", "expiresAt") VALUES ($1, $2, $3, $4)',
      [id, groupId, code, expiresAt || null],
    );

    return NextResponse.json({ code });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const groupId = (await params).id;

    const res = await db.query(
      'SELECT * FROM "GroupInviteLink" WHERE "groupChatId" = $1 AND ("expiresAt" IS NULL OR "expiresAt" > NOW()) ORDER BY "createdAt" DESC',
      [groupId],
    );

    return NextResponse.json(res.rows);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
