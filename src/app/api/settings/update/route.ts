import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const allowed = [
      'accentColor',
      'playerLayout',
      'defaultVolume',
      'autoplay',
      'performanceMode',
      'language',
      'darkMode',
      'showEpg',
    ];
    const data: Record<string, unknown> = {};
    for (const key of allowed) {
      if (key in body) data[key] = body[key];
    }

    const settings = await prisma.userSettings.upsert({
      where: { userId: auth.user!.id },
      create: { userId: auth.user!.id, ...data },
      update: data,
    });

    return NextResponse.json({ ok: true, settings });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}
