import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import { getUserFromReq } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: Request) {
  const user = await getUserFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { token } = await req.json();

  if (!user.twoFactorSecret) {
    return NextResponse.json({ error: '2FA not set up' }, { status: 400 });
  }

  const isValid = speakeasy.totp.verify({
    secret: user.twoFactorSecret,
    encoding: 'base32',
    token,
  });

  if (isValid) {
    await db.query('UPDATE "User" SET "twoFactorEnabled" = true WHERE id = $1', [user.id]);
    return NextResponse.json({ success: true });
  } else {
    return NextResponse.json({ error: 'Invalid token' }, { status: 400 });
  }
}
