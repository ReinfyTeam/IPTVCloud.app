import { NextResponse } from 'next/server';
import { getChannelById } from '@/services/channel-service';
import { decodeBase64Url } from '@/lib/base64';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const channel = await getChannelById(decodeBase64Url(params.id));
    if (!channel) {
      return NextResponse.json({ ok: false, error: 'Channel not found' }, { status: 404 });
    }

    return NextResponse.json({ ok: true, channel });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : String(error) },
      { status: 500 },
    );
  }
}
