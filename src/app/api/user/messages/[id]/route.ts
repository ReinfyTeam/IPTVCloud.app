import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const result = await db.query(
      `SELECT * FROM "Message"
       WHERE ("senderId" = $1 AND "receiverId" = $2)
          OR ("senderId" = $2 AND "receiverId" = $1)
       ORDER BY "createdAt" ASC`,
      [auth.user!.id, (await params).id],
    );

    // Mark as read
    await db.query(
      `UPDATE "Message" SET read = true
       WHERE "senderId" = $1 AND "receiverId" = $2 AND read = false`,
      [(await params).id, auth.user!.id],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Messages details GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
