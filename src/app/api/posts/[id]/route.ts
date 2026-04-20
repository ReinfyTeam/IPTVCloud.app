import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const postResult = await db.query(
      `SELECT p.*, 
              json_build_object('id', u."id", 'username', u."username", 'name', u."name", 'isVerified', u."isVerified", 'role', u."role", 'profileIconUrl', u."profileIconUrl") as user,
              (SELECT count(*)::int FROM "PostComment" pc WHERE pc."postId" = p."id") as comment_count,
              (SELECT count(*)::int FROM "PostLike" pl WHERE pl."postId" = p."id") as like_count,
              COALESCE(
                (SELECT json_agg(a.*) FROM "Attachment" a WHERE a."postId" = p."id"),
                '[]'::json
              ) as attachments
       FROM "Post" p
       JOIN "User" u ON p."userId" = u."id"
       WHERE p."id" = $1`,
      [params.id],
    );

    const post = postResult.rows[0];
    if (!post) return NextResponse.json({ error: 'Post not found' }, { status: 404 });

    const mapped = {
      ...post,
      _count: {
        comments: post.comment_count,
        likes: post.like_count,
      },
    };

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const postResult = await db.query('SELECT "userId" FROM "Post" WHERE "id" = $1', [params.id]);
    const post = postResult.rows[0];
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (post.userId !== auth.user!.id && !auth.isAdmin) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.query('DELETE FROM "Post" WHERE "id" = $1', [params.id]);
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const postResult = await db.query('SELECT "userId" FROM "Post" WHERE "id" = $1', [params.id]);
    const post = postResult.rows[0];
    if (!post) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (post.userId !== auth.user!.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const { title, content } = await req.json();

    const updatedResult = await db.query(
      `UPDATE "Post" 
       SET "title" = COALESCE($1, "title"), 
           "content" = COALESCE($2, "content"),
           "updatedAt" = NOW()
       WHERE "id" = $3 RETURNING *`,
      [title || null, content || null, params.id],
    );

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
