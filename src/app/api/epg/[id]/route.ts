import { NextResponse } from 'next/server';
import { fetchEpgForId } from '@/services/epg-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const id = params.id;
    const res = await fetchEpgForId(id);
    if (!res || !res.found) return NextResponse.json({ ok: false, error: 'EPG not found' }, { status: 404 });
    return NextResponse.json({ ok: true, url: res.url, now: res.now, next: res.next });
  } catch (e: any) {
    console.error('epg route error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
