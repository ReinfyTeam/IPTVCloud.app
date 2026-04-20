import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const result = await db.query(
      `SELECT p.*, 
              json_build_object('username', u."username", 'isVerified', u."isVerified") as user,
              (SELECT count(*)::int FROM "PostComment" pc WHERE pc."postId" = p."id") as comment_count,
              (SELECT count(*)::int FROM "PostLike" pl WHERE pl."postId" = p."id") as like_count
       FROM "Post" p
       JOIN "User" u ON p."userId" = u."id"
       WHERE p."title" ILIKE $1 OR p."content" ILIKE $1
       ORDER BY p."createdAt" DESC
       LIMIT $2`,
      [`%${q}%`, limit],
    );

    // Map counts to match output structure if necessary
    const mapped = result.rows.map((post) => ({
      ...post,
      _count: {
        comments: post.comment_count,
        likes: post.like_count,
      },
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
