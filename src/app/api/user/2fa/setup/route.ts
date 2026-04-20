/* eslint-disable */
import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';
import QRCode from 'qrcode';

// Using require for otplib to ensure compatibility in Next.js environment
const { authenticator } = require('otplib');

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const secret = authenticator.generateSecret();
    const otpauth = authenticator.keyuri(auth.user!.email, 'IPTVCloud.app', secret);
    const qrCode = await QRCode.toDataURL(otpauth);

    return NextResponse.json({ secret, qrCode });
  } catch (error) {
    console.error('2FA setup GET error:', error);
    return NextResponse.json(
      { ok: false, error: 'Failed to initiate 2FA setup.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { token, secret } = await req.json();
    const isValid = authenticator.verify({ token, secret });

    if (!isValid) {
      return NextResponse.json({ ok: false, error: 'Invalid verification code.' }, { status: 400 });
    }

    const updatedResult = await db.query(
      `UPDATE "User"
       SET "twoFactorSecret" = $1, "twoFactorEnabled" = true, "updatedAt" = NOW()
       WHERE id = $2
       RETURNING *`,
      [secret, auth.user!.id],
    );

    return NextResponse.json({ ok: true, user: sanitizeUser(updatedResult.rows[0]) });
  } catch (error) {
    console.error('2FA setup POST error:', error);
    return NextResponse.json({ ok: false, error: 'Failed to enable 2FA.' }, { status: 500 });
  }
}
