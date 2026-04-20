import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import db from '@/lib/db';
import { randomUUID } from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const data = await req.json();
    const { name, streamUrl, logo, country, language, category, description, resolution } = data;

    if (!name || !streamUrl || !country || !language) {
      return NextResponse.json({ error: 'Missing required fields' }, { status: 400 });
    }

    const id = randomUUID();
    const message = `
Stream URL: ${streamUrl}
Logo: ${logo || 'N/A'}
Country: ${country}
Language: ${language}
Category: ${category}
Resolution: ${resolution}

Description:
${description || 'No description provided.'}
    `.trim();

    // Create a support ticket for the submission
    const { rows } = await db.query(
      'INSERT INTO "Ticket" (id, "userId", subject, message, type) VALUES ($1, $2, $3, $4, $5) RETURNING *',
      [id, auth.user!.id, `Channel Submission: ${name}`, message, 'CHANNEL'],
    );

    return NextResponse.json(rows[0]);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
