import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const existingResult = await db.query(
      'SELECT * FROM "PostLike" WHERE "postId" = $1 AND "userId" = $2',
      [(await params).id, auth.user!.id],
    );

    if (existingResult.rows.length > 0) {
      await db.query('DELETE FROM "PostLike" WHERE "postId" = $1 AND "userId" = $2', [
        (await params).id,
        auth.user!.id,
      ]);
      return NextResponse.json({ liked: false });
    } else {
      await db.query('INSERT INTO "PostLike" ("postId", "userId") VALUES ($1, $2)', [
        (await params).id,
        auth.user!.id,
      ]);
      return NextResponse.json({ liked: true });
    }
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
