import { NextResponse } from 'next/server';
import { fetchEpgForId } from '@/services/epg-service';
import { getChannelById, getEpgUrl } from '@/services/channel-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const channelId = decodeURIComponent(params.id);
    const channel = await getChannelById(channelId);

    if (!channel || !channel.epgId) {
      return NextResponse.json(
        { ok: false, error: 'Channel or EPG ID not found' },
        { status: 404 },
      );
    }

    const preferredEpgUrl = await getEpgUrl();
    const res = await fetchEpgForId(channel.epgId, preferredEpgUrl);

    if (!res || !res.found) {
      return NextResponse.json(
        { ok: false, error: 'EPG data not found for ' + channel.epgId },
        { status: 404 },
      );
    }

    return NextResponse.json({
      ok: true,
      url: res.url,
      now: res.now,
      next: res.next,
      schedule: res.schedule,
    });
  } catch (e: any) {
    console.error('epg route error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
