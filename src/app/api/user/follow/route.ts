import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import crypto from 'crypto';

export async function POST(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'Target user ID is required' }, { status: 400 });
    }

    if (targetUserId === auth.user?.id) {
      return NextResponse.json({ ok: false, error: 'You cannot follow yourself' }, { status: 400 });
    }

    const targetUserResult = await db.query('SELECT id FROM "User" WHERE id = $1', [targetUserId]);
    if (targetUserResult.rows.length === 0) {
      return NextResponse.json({ ok: false, error: 'Target user not found' }, { status: 404 });
    }

    const id = crypto.randomUUID();
    await db.query(
      `INSERT INTO "Follower" (id, "followerId", "followingId", "createdAt")
       VALUES ($1, $2, $3, NOW())
       ON CONFLICT ("followerId", "followingId") DO NOTHING`,
      [id, auth.user!.id, targetUserId],
    );

    // Create notification
    const notificationId = crypto.randomUUID();
    await db.query(
      `INSERT INTO "Notification" (id, "userId", title, message, type, link, "createdAt")
       VALUES ($1, $2, $3, $4, $5, $6, NOW())`,
      [
        notificationId,
        targetUserId,
        'New Follower',
        `${auth.user!.username} started following you`,
        'FOLLOW',
        `/profile/${auth.user!.username}`,
      ],
    );

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Follow POST error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to follow user' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  try {
    const { targetUserId } = await req.json();

    if (!targetUserId) {
      return NextResponse.json({ ok: false, error: 'Target user ID is required' }, { status: 400 });
    }

    await db.query('DELETE FROM "Follower" WHERE "followerId" = $1 AND "followingId" = $2', [
      auth.user!.id,
      targetUserId,
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    console.error('Follow DELETE error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to unfollow user' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const userId = searchParams.get('userId');
  const type = searchParams.get('type'); // 'followers' or 'following'

  if (!userId) {
    return NextResponse.json({ ok: false, error: 'User ID is required' }, { status: 400 });
  }

  try {
    if (type === 'followers') {
      const result = await db.query(
        `SELECT u.* FROM "User" u
         JOIN "Follower" f ON u.id = f."followerId"
         WHERE f."followingId" = $1`,
        [userId],
      );
      return NextResponse.json({ ok: true, data: result.rows });
    } else if (type === 'following') {
      const result = await db.query(
        `SELECT u.* FROM "User" u
         JOIN "Follower" f ON u.id = f."followingId"
         WHERE f."followerId" = $1`,
        [userId],
      );
      return NextResponse.json({ ok: true, data: result.rows });
    } else {
      // Check if current user is following target user
      const auth = await authorizeRequest(req);
      if (auth instanceof NextResponse) {
        return NextResponse.json({ ok: true, isFollowing: false });
      }
      const followResult = await db.query(
        'SELECT id FROM "Follower" WHERE "followerId" = $1 AND "followingId" = $2',
        [auth.user!.id, userId],
      );
      return NextResponse.json({ ok: true, isFollowing: followResult.rows.length > 0 });
    }
  } catch (error) {
    console.error('Follow GET error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to fetch follow data' }, { status: 500 });
  }
}
