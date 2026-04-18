import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export async function GET(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const shortcuts = await prisma.customShortcut.findMany({
      where: { userId: user.id },
    });
    return NextResponse.json(shortcuts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch shortcuts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { action, key } = await req.json();

    if (!action || !key) {
      return NextResponse.json({ error: 'Missing action or key' }, { status: 400 });
    }

    const shortcut = await prisma.customShortcut.upsert({
      where: { userId_action: { userId: user.id, action } },
      update: { key },
      create: { userId: user.id, action, key },
    });

    return NextResponse.json(shortcut);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to save shortcut' }, { status: 500 });
  }
}
