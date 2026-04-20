import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import { createNotification } from '@/services/notification-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const responsesResult = await db.query(
      `SELECT tr.*, 
              t."handledById",
              COALESCE(
                (SELECT json_agg(a.*) FROM "Attachment" a WHERE a."ticketResponseId" = tr."id"),
                '[]'::json
              ) as attachments
       FROM "TicketResponse" tr
       JOIN "Ticket" t ON tr."ticketId" = t."id"
       WHERE tr."ticketId" = $1
       ORDER BY tr."createdAt" ASC`,
      [params.id],
    );

    const mapped = responsesResult.rows.map((res) => ({
      id: res.id,
      message: res.message,
      userId: res.userId,
      createdAt: res.createdAt,
      updatedAt: res.updatedAt,
      isAdminResponse: res.userId === res.handledById,
      attachments: res.attachments,
    }));
    return NextResponse.json(mapped);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { message, attachments } = await req.json();
    if (!message && (!attachments || attachments.length === 0)) {
      return NextResponse.json({ error: 'Message or attachment required' }, { status: 400 });
    }

    const ticketResult = await db.query(
      'SELECT "userId", "subject" FROM "Ticket" WHERE "id" = $1',
      [params.id],
    );
    const ticket = ticketResult.rows[0];

    if (!ticket) return NextResponse.json({ error: 'Ticket not found' }, { status: 404 });

    const responseId = crypto.randomUUID();
    const responseResult = await db.query(
      `INSERT INTO "TicketResponse" ("id", "ticketId", "userId", "message", "updatedAt") 
       VALUES ($1, $2, $3, $4, NOW()) RETURNING *`,
      [responseId, params.id, auth.user!.id, message || ''],
    );
    const response = responseResult.rows[0];

    if (attachments && Array.isArray(attachments)) {
      for (const a of attachments) {
        await db.query(
          `INSERT INTO "Attachment" ("id", "ticketResponseId", "url", "filename", "type", "expiresAt")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            crypto.randomUUID(),
            responseId,
            a.url,
            a.filename,
            a.type || 'FILE',
            a.expiresAt ? new Date(a.expiresAt) : null,
          ],
        );
      }
    }

    // Notify the other party
    const targetUserId = auth.user!.id === ticket.userId ? null : ticket.userId;
    if (targetUserId && auth.isStaff) {
      await createNotification({
        userId: targetUserId,
        title: `Staff response on your ticket`,
        message: `Agent replied to: "${ticket.subject}"`,
        type: 'TICKET',
        link: `/support/tickets/${params.id}`,
      });
    }

    return NextResponse.json(response);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { responseId, message } = await req.json();
    if (!message || !responseId)
      return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const responseResult = await db.query('SELECT "userId" FROM "TicketResponse" WHERE "id" = $1', [
      responseId,
    ]);
    const response = responseResult.rows[0];
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (response.userId !== auth.user!.id && !auth.isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updatedResult = await db.query(
      'UPDATE "TicketResponse" SET "message" = $1, "updatedAt" = NOW() WHERE "id" = $2 RETURNING *',
      [message, responseId],
    );

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const responseId = searchParams.get('responseId');
    if (!responseId) return NextResponse.json({ error: 'Response ID required' }, { status: 400 });

    const responseResult = await db.query('SELECT "userId" FROM "TicketResponse" WHERE "id" = $1', [
      responseId,
    ]);
    const response = responseResult.rows[0];
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (response.userId !== auth.user!.id && !auth.isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await db.query('DELETE FROM "TicketResponse" WHERE "id" = $1', [responseId]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
