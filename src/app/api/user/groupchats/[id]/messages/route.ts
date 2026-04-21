import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    // Check if member
    const { rows: memberRows } = await db.query(
      `
      SELECT 1 FROM "GroupChatMember"
      WHERE "groupChatId" = $1 AND "userId" = $2
    `,
      [(await params).id, auth.user!.id],
    );

    if (memberRows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { rows: messages } = await db.query(
      `
      SELECT * FROM "GroupChatMessage"
      WHERE "groupChatId" = $1
      ORDER BY "createdAt" ASC
    `,
      [(await params).id],
    );

    return NextResponse.json(messages);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req, { requireNotMuted: true });
    if (auth instanceof NextResponse) return auth;

    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content required' }, { status: 400 });

    // Check if member
    const { rows: memberRows } = await db.query(
      `
      SELECT 1 FROM "GroupChatMember"
      WHERE "groupChatId" = $1 AND "userId" = $2
    `,
      [(await params).id, auth.user!.id],
    );

    if (memberRows.length === 0) return NextResponse.json({ error: 'Forbidden' }, { status: 403 });

    const { rows: messageRows } = await db.query(
      `
      INSERT INTO "GroupChatMessage" (id, "groupChatId", "userId", content, "createdAt")
      VALUES ($1, $2, $3, $4, NOW())
      RETURNING *
    `,
      [crypto.randomUUID(), (await params).id, auth.user!.id, content],
    );

    return NextResponse.json(messageRows[0]);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
