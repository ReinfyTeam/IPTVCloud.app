import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest } from '@/services/auth-service';

export async function PATCH(
  req: Request,
  { params }: { params: Promise<{ id: string; updateId: string }> },
) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { message, status } = await req.json();

    const updateQuery = `
      UPDATE "IncidentUpdate"
      SET message = COALESCE($1, message),
          status = COALESCE($2, status),
          "updatedAt" = NOW()
      WHERE id = $3
      RETURNING *
    `;
    const res = await db.query(updateQuery, [
      message || null,
      status || null,
      (await params).updateId,
    ]);

    return NextResponse.json(res.rows[0]);
  } catch (error: any) {
    console.error('Failed to update incident update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: Promise<{ id: string; updateId: string }> },
) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    await db.query('DELETE FROM "IncidentUpdate" WHERE id = $1', [(await params).updateId]);

    return NextResponse.json({ success: true });
  } catch (error: any) {
    console.error('Failed to delete incident update:', error);
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
