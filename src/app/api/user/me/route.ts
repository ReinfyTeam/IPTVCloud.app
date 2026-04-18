import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const user = await prisma.user.findUnique({
      where: { id: auth.user!.id },
      include: { settings: true, _count: { select: { favorites: true, watchHistory: true } } },
    });

    if (!user) return NextResponse.json({ ok: false, error: 'User not found' }, { status: 404 });

    return NextResponse.json({
      ok: true,
      user: {
        ...sanitizeUser(user),
        settings: user.settings,
        stats: {
          favorites: user._count.favorites,
          watchHistory: user._count.watchHistory,
        },
      },
    });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const body = await req.json();
    const name = typeof body.name === 'string' ? body.name.trim() : undefined;

    const updated = await prisma.user.update({
      where: { id: auth.user!.id },
      data: { ...(name !== undefined && { name }) },
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 500 },
    );
  }
}
