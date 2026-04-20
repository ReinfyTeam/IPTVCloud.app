import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const result = await db.query(
      `SELECT t.*, 
              CASE 
                WHEN t."handledById" IS NOT NULL THEN 
                  json_build_object('username', u.username, 'name', u.name)
                ELSE NULL 
              END as "handledBy"
       FROM "Ticket" t
       LEFT JOIN "User" u ON t."handledById" = u.id
       WHERE t."userId" = $1
       ORDER BY t."createdAt" DESC`,
      [auth.user!.id],
    );

    return NextResponse.json(result.rows);
  } catch (error) {
    console.error('Fetch tickets error:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
