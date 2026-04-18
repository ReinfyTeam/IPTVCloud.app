import { NextResponse } from 'next/server';
import { getChannelById } from '@/services/channel-service';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: { id: string } }) {
  try {
    const channel = await getChannelById(params.id);
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
