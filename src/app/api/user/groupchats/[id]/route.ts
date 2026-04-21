import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const { name, themeColor } = body;
    const groupId = (await params).id;

    // Check if requester is admin of the group
    const { rows: requesterRows } = await db.query(
      `
      SELECT 1 FROM "GroupChatMember"
      WHERE "groupChatId" = $1 AND "userId" = $2 AND "isAdmin" = true
    `,
      [groupId, auth.user!.id],
    );

    if (requesterRows.length === 0)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (name || themeColor) {
      await db.query(
        `UPDATE "GroupChat" SET name = COALESCE($1, name), "themeColor" = COALESCE($2, "themeColor") WHERE id = $3`,
        [name || null, themeColor || null, groupId],
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const groupId = (await params).id;

    const groupRes = await db.query('SELECT * FROM "GroupChat" WHERE id = $1', [groupId]);
    if (groupRes.rows.length === 0)
      return NextResponse.json({ error: 'Not found' }, { status: 404 });

    const memberRes = await db.query(
      `SELECT m.*, u.username, u."profileIconUrl", u."isVerified" 
       FROM "GroupChatMember" m 
       JOIN "User" u ON m."userId" = u.id 
       WHERE m."groupChatId" = $1 
       ORDER BY m."joinedAt" ASC`,
      [groupId],
    );

    return NextResponse.json({ group: groupRes.rows[0], members: memberRes.rows });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
