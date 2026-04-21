import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const { code } = await params;

    const res = await db.query(
      `SELECT l.*, g.name 
       FROM "GroupInviteLink" l 
       JOIN "GroupChat" g ON l."groupChatId" = g.id 
       WHERE l.code = $1 AND (l."expiresAt" IS NULL OR l."expiresAt" > NOW())`,
      [code],
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    return NextResponse.json({ id: res.rows[0].groupChatId, name: res.rows[0].name });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ code: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { code } = await params;

    const res = await db.query(
      'SELECT "groupChatId" FROM "GroupInviteLink" WHERE code = $1 AND ("expiresAt" IS NULL OR "expiresAt" > NOW())',
      [code],
    );

    if (res.rows.length === 0) {
      return NextResponse.json({ error: 'Invalid or expired link' }, { status: 404 });
    }

    const groupId = res.rows[0].groupChatId;

    // Check if already a member
    const existingMember = await db.query(
      'SELECT id FROM "GroupChatMember" WHERE "groupChatId" = $1 AND "userId" = $2',
      [groupId, auth.user!.id],
    );

    if (existingMember.rows.length > 0) {
      return NextResponse.json({ groupId }); // Already joined
    }

    await db.query(
      'INSERT INTO "GroupChatMember" (id, "groupChatId", "userId") VALUES ($1, $2, $3)',
      [crypto.randomUUID(), groupId, auth.user!.id],
    );

    return NextResponse.json({ success: true, groupId });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
