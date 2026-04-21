import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const incidentResult = await db.query(
      `SELECT i.*, 
              COALESCE(
                (SELECT json_agg(u.* ORDER BY u."createdAt" DESC) FROM "IncidentUpdate" u WHERE u."incidentId" = i."id"),
                '[]'::json
              ) as updates
       FROM "Incident" i
       WHERE i."id" = $1`,
      [(await params).id],
    );

    const incident = incidentResult.rows[0];
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    return NextResponse.json(incident);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
