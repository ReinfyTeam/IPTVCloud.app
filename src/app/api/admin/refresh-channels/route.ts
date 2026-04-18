import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import { refreshChannels } from '@/services/channel-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireAdmin: true, allowApiKey: true });
    if (auth instanceof NextResponse) return auth;
    const result = await refreshChannels();
    return NextResponse.json({
      ok: true,
      refreshedAt: result.fetchedAt,
      total: result.channels.length,
      authMethod: auth.authMethod,
    });
  } catch (e: any) {
    console.error('refresh-channels error', e);
    return NextResponse.json({ ok: false, error: (e as any).message || String(e) }, { status: 500 });
  }
}
