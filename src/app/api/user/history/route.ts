import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const url = new URL(req.url);
    const limit = Math.min(100, Number(url.searchParams.get('limit') || '20'));

    const history = await prisma.watchHistory.findMany({
      where: { userId: auth.user!.id },
      orderBy: { watchedAt: 'desc' },
      take: limit,
    });

    return NextResponse.json({ ok: true, history });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { channelId, channelName, channelLogo } = await req.json();
    if (!channelId || !channelName) {
      return NextResponse.json({ ok: false, error: 'channelId and channelName are required.' }, { status: 400 });
    }

    const entry = await prisma.watchHistory.create({
      data: {
        userId: auth.user!.id,
        channelId,
        channelName,
        channelLogo: channelLogo || null,
      },
    });

    return NextResponse.json({ ok: true, entry });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    await prisma.watchHistory.deleteMany({ where: { userId: auth.user!.id } });
    return NextResponse.json({ ok: true });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}
