import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import { createNotification } from '@/services/notification-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q');

    if (q) {
      const messagesResult = await db.query(
        `SELECT m.*, 
                json_build_object('id', s.id, 'username', s.username, 'profileIconUrl', s."profileIconUrl") as sender,
                json_build_object('id', r.id, 'username', r.username, 'profileIconUrl', r."profileIconUrl") as receiver
         FROM "Message" m
         JOIN "User" s ON m."senderId" = s.id
         JOIN "User" r ON m."receiverId" = r.id
         WHERE (m."senderId" = $1 OR m."receiverId" = $1)
           AND m.content ILIKE $2
         ORDER BY m."createdAt" DESC`,
        [auth.user!.id, `%${q}%`],
      );
      return NextResponse.json(messagesResult.rows);
    }

    // Get all users the current user has exchanged messages with
    const userIdsResult = await db.query(
      `SELECT DISTINCT "userId" FROM (
        SELECT "receiverId" as "userId" FROM "Message" WHERE "senderId" = $1
        UNION
        SELECT "senderId" as "userId" FROM "Message" WHERE "receiverId" = $1
      ) as combined`,
      [auth.user!.id],
    );

    const userIds = userIdsResult.rows.map((r) => r.userId);

    if (userIds.length === 0) {
      return NextResponse.json([]);
    }

    const conversationsResult = await db.query(
      `SELECT id, username, name, "profileIconUrl", "isVerified"
       FROM "User"
       WHERE id = ANY($1)`,
      [userIds],
    );

    const conversations = conversationsResult.rows;

    // Get last message and unread count for each conversation
    const result = await Promise.all(
      conversations.map(async (u) => {
        const lastMsgResult = await db.query(
          `SELECT * FROM "Message"
           WHERE ("senderId" = $1 AND "receiverId" = $2)
              OR ("senderId" = $2 AND "receiverId" = $1)
           ORDER BY "createdAt" DESC
           LIMIT 1`,
          [auth.user!.id, u.id],
        );

        const unreadCountResult = await db.query(
          `SELECT COUNT(*)::int as count FROM "Message"
           WHERE "senderId" = $1 AND "receiverId" = $2 AND read = false`,
          [u.id, auth.user!.id],
        );

        return {
          user: u,
          lastMessage: lastMsgResult.rows[0] || null,
          unreadCount: unreadCountResult.rows[0].count,
        };
      }),
    );

    return NextResponse.json(
      result.sort(
        (a, b) =>
          new Date(b.lastMessage?.createdAt || 0).getTime() -
          new Date(a.lastMessage?.createdAt || 0).getTime(),
      ),
    );
  } catch (error) {
    console.error('Messages GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { receiverId, content } = await req.json();

    if (!receiverId || !content) {
      return NextResponse.json({ error: 'Missing fields' }, { status: 400 });
    }

    const id = crypto.randomUUID();
    const messageResult = await db.query(
      `INSERT INTO "Message" (id, "senderId", "receiverId", content, "createdAt")
       VALUES ($1, $2, $3, $4, NOW())
       RETURNING *`,
      [id, auth.user!.id, receiverId, content],
    );

    const message = messageResult.rows[0];

    // Create notification for receiver
    await createNotification({
      userId: receiverId,
      title: `New message from @${auth.user!.username || 'user'}`,
      message: content.substring(0, 100),
      type: 'MESSAGE',
      link: `/account/messages/${auth.user!.id}`,
    });

    return NextResponse.json(message);
  } catch (error) {
    console.error('Messages POST error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
