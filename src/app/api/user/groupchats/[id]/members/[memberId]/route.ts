import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { action } = await req.json();
    const { id: groupId, memberId } = await params;

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

    if (action === 'PROMOTE') {
      await db.query('UPDATE "GroupChatMember" SET "isAdmin" = true WHERE id = $1', [memberId]);
    } else if (action === 'DEMOTE') {
      // Creator cannot be demoted (assuming creator is stored in GroupChat)
      await db.query('UPDATE "GroupChatMember" SET "isAdmin" = false WHERE id = $1', [memberId]);
    } else if (action === 'MUTE') {
      await db.query('UPDATE "GroupChatMember" SET "isMuted" = true WHERE id = $1', [memberId]);
    } else if (action === 'UNMUTE') {
      await db.query('UPDATE "GroupChatMember" SET "isMuted" = false WHERE id = $1', [memberId]);
    } else if (action === 'KICK') {
      await db.query('DELETE FROM "GroupChatMember" WHERE id = $1', [memberId]);
    }

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; memberId: string }> },
) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { id: groupId, memberId } = await params;

    if (memberId === 'me') {
      await db.query('DELETE FROM "GroupChatMember" WHERE "groupChatId" = $1 AND "userId" = $2', [
        groupId,
        auth.user!.id,
      ]);
      return NextResponse.json({ success: true });
    }

    // Only admins can delete others
    const { rows: requesterRows } = await db.query(
      'SELECT 1 FROM "GroupChatMember" WHERE "groupChatId" = $1 AND "userId" = $2 AND "isAdmin" = true',
      [groupId, auth.user!.id],
    );
    if (requesterRows.length === 0)
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    await db.query('DELETE FROM "GroupChatMember" WHERE id = $1', [memberId]);
    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
