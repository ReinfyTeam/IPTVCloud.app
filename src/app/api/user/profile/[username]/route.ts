import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ username: string }> }) {
  try {
    const userResult = await db.query(
      'SELECT id, username, name, role, "isVerified", "createdAt" FROM "User" WHERE LOWER(username) = $1',
      [(await params).username.toLowerCase()],
    );
    const user = userResult.rows[0];

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    // Get counts
    const countsResult = await db.query(
      `SELECT
        (SELECT COUNT(*) FROM "Post" WHERE "userId" = $1) as posts,
        (SELECT COUNT(*) FROM "Comment" WHERE "userId" = $1) as comments,
        (SELECT COUNT(*) FROM "Favorite" WHERE "userId" = $1) as favorites`,
      [user.id],
    );
    const counts = countsResult.rows[0];

    // Get posts
    const postsResult = await db.query(
      `SELECT p.*,
        (SELECT COUNT(*) FROM "PostComment" WHERE "postId" = p.id) as "commentsCount",
        (SELECT COUNT(*) FROM "PostLike" WHERE "postId" = p.id) as "likesCount"
      FROM "Post" p
      WHERE p."userId" = $1
      ORDER BY p."createdAt" DESC
      LIMIT 5`,
      [user.id],
    );

    const posts = postsResult.rows.map((p) => ({
      ...p,
      _count: {
        comments: parseInt(p.commentsCount),
        likes: parseInt(p.likesCount),
      },
    }));

    return NextResponse.json({
      ...user,
      _count: {
        posts: parseInt(counts.posts),
        comments: parseInt(counts.comments),
        favorites: parseInt(counts.favorites),
      },
      posts,
    });
  } catch (error) {
    console.error('Profile GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
