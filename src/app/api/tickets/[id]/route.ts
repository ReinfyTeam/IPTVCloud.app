import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const ticketResult = await db.query(
      `SELECT t.*, 
              json_build_object('email', u."email", 'name', u."name", 'username', u."username") as user,
              COALESCE(
                (SELECT json_agg(a.*) FROM "Attachment" a WHERE a."ticketId" = t."id"),
                '[]'::json
              ) as attachments
       FROM "Ticket" t
       JOIN "User" u ON t."userId" = u."id"
       WHERE t."id" = $1`,
      [(await params).id],
    );

    const ticket = ticketResult.rows[0];
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    // Access control: only creator or staff
    if (ticket.userId !== auth.user!.id && !auth.isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
