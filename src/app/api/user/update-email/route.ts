import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { email } = await req.json();
    const cleanEmail = String(email || '')
      .trim()
      .toLowerCase();

    if (!cleanEmail || !cleanEmail.includes('@')) {
      return NextResponse.json({ ok: false, error: 'Invalid email address.' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email: cleanEmail } });
    if (existing && existing.id !== auth.user!.id) {
      return NextResponse.json({ ok: false, error: 'Email already in use.' }, { status: 409 });
    }

    const updated = await prisma.user.update({
      where: { id: auth.user!.id },
      data: { email: cleanEmail },
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 500 },
    );
  }
}
