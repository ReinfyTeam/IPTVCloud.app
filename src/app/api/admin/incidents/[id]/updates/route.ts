import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { message, status } = await req.json();
    if (!message || !status)
      return NextResponse.json({ error: 'Message and status required' }, { status: 400 });

    const updateId = crypto.randomUUID();
    const insertUpdateQuery = `
      INSERT INTO "IncidentUpdate" (id, "incidentId", message, status, "createdAt", "updatedAt")
      VALUES ($1, $2, $3, $4, NOW(), NOW())
      RETURNING *
    `;
    const updateRes = await db.query(insertUpdateQuery, [updateId, params.id, message, status]);

    // Also update parent incident status
    const updateIncidentQuery = `
      UPDATE "Incident"
      SET status = $1, 
          "resolvedAt" = CASE WHEN $1 = 'RESOLVED' THEN NOW() ELSE "resolvedAt" END,
          "updatedAt" = NOW()
      WHERE id = $2
    `;
    await db.query(updateIncidentQuery, [status, params.id]);

    return NextResponse.json(updateRes.rows[0]);
  } catch (error) {
    console.error('Failed to create incident update:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
