import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import { createNotification } from '@/services/notification-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { targetUserId } = await req.json();
    if (!targetUserId) {
      return NextResponse.json({ error: 'Target user ID is required' }, { status: 400 });
    }

    const groupId = (await params).id;

    // Check if the current user is a member of the group
    const memberRes = await db.query(
      'SELECT id FROM "GroupChatMember" WHERE "groupChatId" = $1 AND "userId" = $2',
      [groupId, auth.user!.id],
    );

    if (memberRes.rows.length === 0) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    // Check for mutual follow
    const followRes = await db.query(
      `SELECT count(*)::int as count FROM "Follower" 
       WHERE ("followerId" = $1 AND "followingId" = $2) 
          OR ("followerId" = $2 AND "followingId" = $1)`,
      [auth.user!.id, targetUserId],
    );

    if (followRes.rows[0].count < 2) {
      return NextResponse.json(
        { error: 'You can only invite users who you mutually follow' },
        { status: 400 },
      );
    }

    // Check if already a member
    const existingMember = await db.query(
      'SELECT id FROM "GroupChatMember" WHERE "groupChatId" = $1 AND "userId" = $2',
      [groupId, targetUserId],
    );

    if (existingMember.rows.length > 0) {
      return NextResponse.json({ error: 'User is already a member' }, { status: 400 });
    }

    // Add member
    await db.query(
      'INSERT INTO "GroupChatMember" (id, "groupChatId", "userId") VALUES ($1, $2, $3)',
      [crypto.randomUUID(), groupId, targetUserId],
    );

    // Get group name
    const groupRes = await db.query('SELECT name FROM "GroupChat" WHERE id = $1', [groupId]);
    const groupName = groupRes.rows[0]?.name || 'a group chat';

    // Notify user
    await createNotification({
      userId: targetUserId,
      title: 'Group Invitation',
      message: `${auth.user!.username || 'Someone'} invited you to join ${groupName}.`,
      type: 'MESSAGE',
      link: `/account/messages/group/${groupId}`,
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
