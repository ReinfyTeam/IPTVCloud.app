import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const updated = await prisma.user.update({
      where: { id: auth.user!.id },
      data: {
        twoFactorSecret: null,
        twoFactorEnabled: false,
      },
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    return NextResponse.json({ ok: false, error: 'Failed to disable 2FA.' }, { status: 500 });
  }
}
