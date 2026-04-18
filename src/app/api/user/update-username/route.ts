import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { username } = await req.json();
    const cleanUsername = String(username || '')
      .trim()
      .toLowerCase();

    if (!cleanUsername || cleanUsername.length < 3 || !/^[a-z0-9_]+$/.test(cleanUsername)) {
      return NextResponse.json({ ok: false, error: 'Invalid username format.' }, { status: 400 });
    }

    const user = await prisma.user.findUnique({ where: { id: auth.user!.id } });
    if (!user) return NextResponse.json({ ok: false, error: 'User not found.' }, { status: 404 });

    // Check 3 months logic
    if (user.lastUsernameChange) {
      const threeMonthsAgo = new Date();
      threeMonthsAgo.setMonth(threeMonthsAgo.getMonth() - 3);
      if (user.lastUsernameChange > threeMonthsAgo) {
        const nextDate = new Date(user.lastUsernameChange);
        nextDate.setMonth(nextDate.getMonth() + 3);
        return NextResponse.json(
          {
            ok: false,
            error: `Username can only be changed once every 3 months. Next change available after ${nextDate.toLocaleDateString()}.`,
          },
          { status: 403 },
        );
      }
    }

    // Check availability
    const taken = await prisma.user.findUnique({ where: { username: cleanUsername } });
    if (taken && taken.id !== user.id) {
      return NextResponse.json(
        { ok: false, error: 'That username is already taken.' },
        { status: 409 },
      );
    }

    const updated = await prisma.user.update({
      where: { id: user.id },
      data: {
        username: cleanUsername,
        lastUsernameChange: new Date(),
      },
    });

    return NextResponse.json({ ok: true, user: sanitizeUser(updated) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Update failed.' },
      { status: 500 },
    );
  }
}
