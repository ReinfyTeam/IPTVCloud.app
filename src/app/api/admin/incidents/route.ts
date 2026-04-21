import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';
import { createNotification } from '@/services/notification-service';
import crypto from 'crypto';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const incidentsQuery = `
      SELECT i.*, 
             COALESCE(
               (SELECT json_agg(u ORDER BY u."createdAt" DESC) 
                FROM "IncidentUpdate" u 
                WHERE u."incidentId" = i.id), 
               '[]'::json
             ) as updates
      FROM "Incident" i
      ORDER BY i."createdAt" DESC
    `;
    const res = await db.query(incidentsQuery);
    return NextResponse.json(res.rows);
  } catch (error) {
    console.error('Failed to fetch incidents:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { action, id, title, description, status, severity, type, tags } = await req.json();

    if (action === 'CREATE') {
      const incidentId = crypto.randomUUID();
      const insertQuery = `
        INSERT INTO "Incident" (id, title, description, type, status, severity, tags, "createdAt", "updatedAt")
        VALUES ($1, $2, $3, $4, $5, $6, $7, NOW(), NOW())
        RETURNING *
      `;
      const res = await db.query(insertQuery, [
        incidentId,
        title,
        description,
        type || 'SYSTEM',
        status || 'INVESTIGATING',
        severity || 'LOW',
        tags || [],
      ]);
      const incident = res.rows[0];

      // Notify all users if severity is high/critical
      if (severity === 'CRITICAL' || severity === 'HIGH') {
        const usersRes = await db.query('SELECT id FROM "User"');
        for (const user of usersRes.rows) {
          await createNotification({
            userId: user.id,
            title: `SIGNAL ALERT: ${title}`,
            message: `System Incident: ${description.substring(0, 100)}...`,
            type: 'STATUS',
            link: '/status',
          });
        }
      }

      return NextResponse.json({ success: true, incident });
    }

    if (action === 'UPDATE') {
      const resolvedAt = status === 'RESOLVED' ? new Date() : null;

      let updateFields = [];
      let params = [];
      let i = 1;

      if (title) {
        updateFields.push(`title = $${i++}`);
        params.push(title);
      }
      if (description) {
        updateFields.push(`description = $${i++}`);
        params.push(description);
      }
      if (type) {
        updateFields.push(`type = $${i++}`);
        params.push(type);
      }
      if (status) {
        updateFields.push(`status = $${i++}`);
        params.push(status);
      }
      if (severity) {
        updateFields.push(`severity = $${i++}`);
        params.push(severity);
      }
      if (tags) {
        updateFields.push(`tags = $${i++}`);
        params.push(tags);
      }

      updateFields.push(`"resolvedAt" = $${i++}`);
      params.push(resolvedAt);
      updateFields.push(`"updatedAt" = NOW()`);

      const updateQuery = `
        UPDATE "Incident"
        SET ${updateFields.join(', ')}
        WHERE id = $${i}
        RETURNING *
      `;
      params.push(id);

      const res = await db.query(updateQuery, params);
      return NextResponse.json({ success: true, incident: res.rows[0] });
    }

    if (action === 'DELETE') {
      await db.query('DELETE FROM "Incident" WHERE id = $1', [id]);
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    console.error('Failed to process incident action:', error);
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
