import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { name, streamUrl, logo, category, country, language, region, description, isSubmitted } =
      await req.json();

    if (!name || !streamUrl) {
      return NextResponse.json({ error: 'Name and Stream URL are required' }, { status: 400 });
    }

    const id = randomUUID();
    const now = new Date();

    const { rows } = await db.query(
      'INSERT INTO "CustomChannel" ("id", "userId", "name", "streamUrl", "logo", "category", "country", "language", "region", "description", "isSubmitted", "createdAt", "updatedAt") VALUES ($1, $2, $3, $4, $5, $6, $7, $8, $9, $10, $11, $12, $13) RETURNING *',
      [
        id,
        auth.user.id,
        name,
        streamUrl,
        logo,
        category,
        country,
        language,
        region,
        description,
        isSubmitted,
        now,
        now,
      ],
    );

    if (isSubmitted) {
      const ticketId = randomUUID();
      const message = `Channel Name: ${name}
Stream URL: ${streamUrl}
Description: ${description || 'N/A'}`;
      await db.query(
        'INSERT INTO "Ticket" ("id", "userId", "subject", "message", "type") VALUES ($1, $2, $3, $4, $5)',
        [
          ticketId,
          auth.user.id,
          `Community Channel Submission: ${name}`,
          message,
          'CHANNEL_SUBMISSION',
        ],
      );
    }

    return NextResponse.json(rows[0]);
  } catch (error) {
    console.error('[CUSTOM_CHANNEL_POST_ERROR]', error);
    return NextResponse.json({ error: 'Failed to create custom channel' }, { status: 500 });
  }
}

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    if (!auth.user) {
      return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
    }

    const { rows } = await db.query(
      'SELECT * FROM "CustomChannel" WHERE "userId" = $1 ORDER BY "createdAt" DESC',
      [auth.user.id],
    );

    return NextResponse.json(rows);
  } catch (error) {
    console.error('[CUSTOM_CHANNEL_GET_ERROR]', error);
    return NextResponse.json({ error: 'Failed to fetch custom channels' }, { status: 500 });
  }
}
