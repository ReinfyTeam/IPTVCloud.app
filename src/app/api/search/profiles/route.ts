import { NextResponse } from 'next/server';
import db from '@/lib/db';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const { rows: users } = await db.query(
      `
      SELECT id, username, name, role, "isVerified"
      FROM "User"
      WHERE username ILIKE $1 OR name ILIKE $1
      LIMIT $2
    `,
      [`%${q}%`, limit],
    );

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
