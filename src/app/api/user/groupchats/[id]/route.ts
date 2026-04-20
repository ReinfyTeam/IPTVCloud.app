import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { action, targetUserId, name } = await req.json();

    // Check if requester is admin of the group
    const { rows: requesterRows } = await db.query(
      `
      SELECT 1 FROM "GroupChatMember"
      WHERE "groupChatId" = $1 AND "userId" = $2 AND "isAdmin" = true
    `,
      [params.id, auth.user!.id],
    );

    if (requesterRows.length === 0)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    if (action === 'rename' && name) {
      await db.query(
        `
        UPDATE "GroupChat" SET name = $1 WHERE id = $2
      `,
        [name, params.id],
      );
    } else if (action === 'add_admin' && targetUserId) {
      await db.query(
        `
        UPDATE "GroupChatMember" SET "isAdmin" = true
        WHERE "groupChatId" = $1 AND "userId" = $2
      `,
        [params.id, targetUserId],
      );
    } else if (action === 'remove_admin' && targetUserId) {
      await db.query(
        `
        UPDATE "GroupChatMember" SET "isAdmin" = false
        WHERE "groupChatId" = $1 AND "userId" = $2
      `,
        [params.id, targetUserId],
      );
    } else if (action === 'kick' && targetUserId) {
      await db.query(
        `
        DELETE FROM "GroupChatMember"
        WHERE "groupChatId" = $1 AND "userId" = $2
      `,
        [params.id, targetUserId],
      );
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
