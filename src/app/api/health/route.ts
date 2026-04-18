import { NextResponse } from 'next/server';
import { getHealth, listHealth } from '@/services/health-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const url = new URL(req.url);
    const id = url.searchParams.get('channelId');
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined;
    if (id) {
      const h = await getHealth(id);
      return NextResponse.json({ ok: true, health: h ?? null });
    } else {
      const list = await listHealth(limit);
      return NextResponse.json({ ok: true, health: list });
    }
  } catch (e: any) {
    console.error('health error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
