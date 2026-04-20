import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'newest';
    const filterType = searchParams.get('type');
    const archived = searchParams.get('archived') === 'true';

    let orderBy = 't."createdAt" DESC';
    if (sort === 'oldest') orderBy = 't."createdAt" ASC';
    if (sort === 'type') orderBy = 't."type" ASC';
    if (sort === 'name') orderBy = 'u."username" ASC';

    let query = `
      SELECT t.*, 
             json_build_object('email', u."email", 'name', u."name", 'role', u."role", 'username', u."username") as user,
             CASE WHEN h."id" IS NOT NULL THEN json_build_object('name', h."name", 'username', h."username") ELSE NULL END as "handledBy"
      FROM "Ticket" t
      JOIN "User" u ON t."userId" = u."id"
      LEFT JOIN "User" h ON t."handledById" = h."id"
      WHERE t."isArchived" = $1
    `;
    const params: any[] = [archived];

    if (filterType) {
      query += ` AND t."type" = $2`;
      params.push(filterType);
    }

    query += ` ORDER BY ${orderBy}`;

    const result = await db.query(query, params);
    return NextResponse.json(result.rows);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { subject, message, type, attachments } = await req.json();

    const allowedTypes = ['SUPPORT', 'APPEAL', 'BUG', 'FEATURE', 'CHANNEL'];
    if (!subject || !message || !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid or missing fields' }, { status: 400 });
    }

    const ticketId = crypto.randomUUID();
    const ticketResult = await db.query(
      `INSERT INTO "Ticket" ("id", "userId", "subject", "message", "type", "updatedAt") 
       VALUES ($1, $2, $3, $4, $5, NOW()) RETURNING *`,
      [ticketId, auth.user!.id, subject, message, type],
    );
    const ticket = ticketResult.rows[0];

    if (attachments && Array.isArray(attachments)) {
      for (const a of attachments) {
        await db.query(
          `INSERT INTO "Attachment" ("id", "ticketId", "url", "filename", "type", "expiresAt")
           VALUES ($1, $2, $3, $4, $5, $6)`,
          [
            crypto.randomUUID(),
            ticketId,
            a.url,
            a.filename,
            a.type || 'FILE',
            a.expiresAt ? new Date(a.expiresAt) : null,
          ],
        );
      }
    }

    return NextResponse.json(ticket);
  } catch (error) {
    console.error(error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { id, status, handledById, isArchived } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const ticketResult = await db.query('SELECT * FROM "Ticket" WHERE "id" = $1', [id]);
    const ticket = ticketResult.rows[0];
    if (!ticket) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (!auth.isStaff) {
      if (ticket.userId !== auth.user!.id) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      // User can only archive
      if (status !== undefined || handledById !== undefined) {
        return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
      }
      const updatedResult = await db.query(
        `UPDATE "Ticket" SET "isArchived" = COALESCE($1, "isArchived"), "updatedAt" = NOW() WHERE "id" = $2 RETURNING *`,
        [isArchived !== undefined ? isArchived : null, id],
      );
      return NextResponse.json(updatedResult.rows[0]);
    }

    const updatedResult = await db.query(
      `UPDATE "Ticket" 
       SET "status" = COALESCE($1, "status"), 
           "handledById" = COALESCE($2, "handledById"), 
           "isArchived" = COALESCE($3, "isArchived"),
           "updatedAt" = NOW()
       WHERE "id" = $4 RETURNING *`,
      [status || null, handledById || null, isArchived !== undefined ? isArchived : null, id],
    );

    return NextResponse.json(updatedResult.rows[0]);
  } catch (error) {
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

    await db.query('DELETE FROM "Ticket" WHERE "id" = $1', [id]);

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
