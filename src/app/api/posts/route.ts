import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import { createNotification } from '@/services/notification-service';
import { z } from 'zod';
import { sanitizeMarkdown } from '@/lib/sanitize';

export const dynamic = 'force-dynamic';

const postSchema = z.object({
  title: z.string().min(1).max(255),
  content: z.string().min(1),
  attachments: z
    .array(
      z.object({
        url: z.string().url(),
        filename: z.string(),
        type: z.string().optional(),
        expiresAt: z.string().optional().nullable(),
      }),
    )
    .optional(),
});

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'newest';

    let orderBy = 'p."createdAt" DESC';
    if (sort === 'oldest') orderBy = 'p."createdAt" ASC';
    if (sort === 'likes') orderBy = 'like_count DESC';
    if (sort === 'comments') orderBy = 'comment_count DESC';

    const result = await db.query(
      `SELECT p.*, 
              json_build_object('id', u."id", 'username', u."username", 'name', u."name", 'isVerified', u."isVerified", 'role', u."role", 'profileIconUrl', u."profileIconUrl") as user,
              (SELECT count(*)::int FROM "PostComment" pc WHERE pc."postId" = p."id") as comment_count,
              (SELECT count(*)::int FROM "PostLike" pl WHERE pl."postId" = p."id") as like_count
       FROM "Post" p
       JOIN "User" u ON p."userId" = u."id"
       ORDER BY ${orderBy}`,
    );

    const mapped = result.rows.map((post) => ({
      ...post,
      _count: {
        comments: post.comment_count,
        likes: post.like_count,
      },
    }));

    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireNotMuted: true });
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const validatedData = postSchema.parse(body);

    const postId = crypto.randomUUID();
    const postResult = await db.query(
      `INSERT INTO "Post" ("id", "userId", "title", "content", "updatedAt") 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [validatedData.title, sanitizeMarkdown(validatedData.content), auth.user!.id],
    );
    const post = postResult.rows[0];

    if (validatedData.attachments && Array.isArray(validatedData.attachments)) {
      for (const a of validatedData.attachments) {
        await db.query(
          `INSERT INTO "Attachment" ("id", "postId", "url", "filename", "type", "expiresAt")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            crypto.randomUUID(),
            postId,
            a.url,
            a.filename,
            a.type || 'FILE',
            a.expiresAt ? new Date(a.expiresAt) : null,
          ],
        );
      }
    }

    // Include user data for the response
    const userResult = await db.query(
      'SELECT "username", "name", "isVerified", "role" FROM "User" WHERE "id" = $1',
      [auth.user!.id],
    );
    post.user = userResult.rows[0];

    // Notify followers
    const followersResult = await db.query(
      'SELECT "followerId" FROM "Follower" WHERE "followingId" = $1',
      [auth.user!.id],
    );

    for (const f of followersResult.rows) {
      await createNotification({
        userId: f.followerId,
        title: `New signal from @${auth.user!.username || 'user'}`,
        message: `Signal published: "${validatedData.title}"`,
        type: 'POST',
        link: `/posts/${postId}`,
      });
    }

    return NextResponse.json(post);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed to create post.' }, { status: 500 });
  }
}
