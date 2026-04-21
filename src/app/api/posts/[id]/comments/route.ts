import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import { createNotification } from '@/services/notification-service';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const { rows: comments } = await db.query(
      `SELECT pc.*, 
        json_build_object(
          'id', u.id,
          'username', u.username,
          'name', u.name,
          'isVerified', u."isVerified",
          'role', u.role,
          'profileIconUrl', u."profileIconUrl"
        ) as user
       FROM "PostComment" pc
       JOIN "User" u ON pc."userId" = u.id
       WHERE pc."postId" = $1
       ORDER BY pc."createdAt" DESC`,
      [(await params).id],
    );
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req, { requireNotMuted: true });
    if (auth instanceof NextResponse) return auth;

    const { content, parentId } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content is required.' }, { status: 400 });

    const { rows: postRows } = await db.query('SELECT "userId", title FROM "Post" WHERE id = $1', [
      (await params).id,
    ]);
    const post = postRows[0];

    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const id = randomUUID();
    const { rows } = await db.query(
      `INSERT INTO "PostComment" (id, "postId", "userId", content, "parentId")
       VALUES ($1, $2, $3, $4, $5)
       RETURNING *`,
      [id, (await params).id, auth.user!.id, content, parentId],
    );

    // Fetch with user info to match previous include
    const { rows: commentWithUserRows } = await db.query(
      `SELECT pc.*, 
        json_build_object(
          'id', u.id,
          'username', u.username,
          'name', u.name,
          'isVerified', u."isVerified",
          'role', u.role,
          'profileIconUrl', u."profileIconUrl"
        ) as user
       FROM "PostComment" pc
       JOIN "User" u ON pc."userId" = u.id
       WHERE pc.id = $1`,
      [id],
    );
    const comment = commentWithUserRows[0];

    // Notify post owner
    if (post.userId !== auth.user!.id) {
      await createNotification({
        userId: post.userId,
        title: `New comment on your post`,
        message: `${auth.user!.username || 'Someone'} commented on "${post.title}"`,
        type: 'POST',
        link: `/posts/${(await params).id}`,
      });
    }

    // Notify parent comment user
    if (parentId) {
      const { rows: parentRows } = await db.query(
        'SELECT "userId" FROM "PostComment" WHERE id = $1',
        [parentId],
      );
      const parent = parentRows[0];
      if (parent && parent.userId !== auth.user!.id && parent.userId !== post.userId) {
        await createNotification({
          userId: parent.userId,
          title: `Reply to your comment`,
          message: `${auth.user!.username || 'Someone'} replied to your comment on "${post.title}"`,
          type: 'POST',
          link: `/posts/${(await params).id}`,
        });
      }
    }

    return NextResponse.json(comment);
  } catch (error) {
    console.error('Post comment POST error', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
