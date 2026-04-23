import { NextResponse } from 'next/server';
import speakeasy from 'speakeasy';
import qrcode from 'qrcode';
import { getUserFromReq } from '@/lib/auth';
import db from '@/lib/db';

export async function POST(req: Request) {
  const user = await getUserFromReq(req);
  if (!user) {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const secret = speakeasy.generateSecret({
    name: `IPTVCloud (${user.email})`,
  });

  await db.query(
    'UPDATE "User" SET "twoFactorSecret" = $1, "twoFactorEnabled" = false WHERE id = $2',
    [secret.base32, user.id],
  );

  const qrCode = await qrcode.toDataURL(secret.otpauth_url!);

  return NextResponse.json({ secret: secret.base32, qrCode });
}
