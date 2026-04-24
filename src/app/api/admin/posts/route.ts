import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const q = url.searchParams.get('q') || '';
    const page = parseInt(url.searchParams.get('page') || '1');
    const limit = parseInt(url.searchParams.get('limit') || '50');
    const skip = (page - 1) * limit;

    let whereClause = '';
    let params: any[] = [];
    if (q) {
      whereClause = 'WHERE p.id = $1 OR p.title ILIKE $2 OR p.content ILIKE $2';
      params = [q, `%${q}%`];
    }

    const postsQuery = `
      SELECT 
        p.*, 
        json_build_object('id', u.id, 'username', u.username, 'email', u.email) as user,
        json_build_object(
          'comments', (SELECT COUNT(*)::int FROM "Comment" WHERE "postId" = p.id),
          'likes', (SELECT COUNT(*)::int FROM "Like" WHERE "postId" = p.id)
        ) as "_count"
      FROM "Post" p
      LEFT JOIN "User" u ON p."userId" = u.id
      ${whereClause}
      ORDER BY p."createdAt" DESC
      LIMIT $${params.length + 1} OFFSET $${params.length + 2}
    `;

    const res = await db.query(postsQuery, [...params, limit, skip]);

    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('Failed to fetch posts:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const id = searchParams.get('id');

    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    await db.query('DELETE FROM "Post" WHERE id = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Failed to delete post:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
