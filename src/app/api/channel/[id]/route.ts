import { NextResponse } from 'next/server';
import { getChannelById } from '@/services/channel-service';
import { decodeBase64Url } from '@/lib/base64';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const auth = await authorizeRequest(req);
    const userId = auth instanceof NextResponse ? undefined : auth.user?.id;

    const channel = await getChannelById(decodeBase64Url((await params).id), userId);
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
