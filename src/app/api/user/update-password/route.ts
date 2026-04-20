import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, verifyPassword, hashPassword } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { currentPassword, newPassword } = await req.json();

    if (!currentPassword || !newPassword) {
      return NextResponse.json({ ok: false, error: 'Missing password fields.' }, { status: 400 });
    }

    const isValid = await verifyPassword(currentPassword, auth.user!.password);
    if (!isValid) {
      return NextResponse.json(
        { ok: false, error: 'Incorrect current password.' },
        { status: 400 },
      );
    }

    if (newPassword.length < 8) {
      return NextResponse.json({ ok: false, error: 'New password too short.' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await db.query('UPDATE "User" SET "password" = $1 WHERE "id" = $2', [
      hashedPassword,
      auth.user!.id,
    ]);

    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 500 },
    );
  }
}
