import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    const favs = await prisma.favorite.findMany({ where: { userId: auth.user!.id }, orderBy: { createdAt: 'desc' } });
    return NextResponse.json({ ok: true, favorites: favs });
  } catch (e: any) {
    console.error('favorites GET error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    const { channelId } = await req.json();
    if (!channelId) return NextResponse.json({ ok: false, error: 'Missing channelId' }, { status: 400 });
    // avoid duplicates
    const exists = await prisma.favorite.findFirst({ where: { userId: auth.user!.id, channelId } });
    if (exists) return NextResponse.json({ ok: true, favorite: exists });
    const f = await prisma.favorite.create({ data: { userId: auth.user!.id, channelId } });
    return NextResponse.json({ ok: true, favorite: f });
  } catch (e: any) {
    console.error('favorites POST error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    const { channelId } = await req.json();
    if (!channelId) return NextResponse.json({ ok: false, error: 'Missing channelId' }, { status: 400 });
    await prisma.favorite.deleteMany({ where: { userId: auth.user!.id, channelId } });
    return NextResponse.json({ ok: true });
  } catch (e: any) {
    console.error('favorites DELETE error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
