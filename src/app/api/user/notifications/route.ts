import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const unread = searchParams.get('unread') === 'true';
    const limit = parseInt(searchParams.get('limit') || '20');

    let query = 'SELECT * FROM "Notification" WHERE "userId" = $1';
    const params: any[] = [auth.user!.id];

    if (unread) {
      query += ' AND read = false';
    }

    query += ' ORDER BY "createdAt" DESC LIMIT $' + (params.length + 1);
    params.push(limit);

    const result = await db.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Notifications GET error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { notificationId, markAll } = await req.json();

    if (markAll) {
      await db.query('UPDATE "Notification" SET read = true WHERE "userId" = $1 AND read = false', [
        auth.user!.id,
      ]);
      return NextResponse.json({ success: true });
    }

    if (!notificationId) {
      return NextResponse.json({ error: 'Notification ID required' }, { status: 400 });
    }

    const notificationResult = await db.query('SELECT "userId" FROM "Notification" WHERE id = $1', [
      notificationId,
    ]);
    const notification = notificationResult.rows[0];

    if (!notification || notification.userId !== auth.user!.id) {
      return NextResponse.json({ error: 'Not found' }, { status: 404 });
    }

    await db.query('UPDATE "Notification" SET read = true WHERE id = $1', [notificationId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    console.error('Notifications PATCH error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
