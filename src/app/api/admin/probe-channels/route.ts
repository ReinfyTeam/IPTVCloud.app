import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import { probeAllChannels } from '@/services/health-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireAdmin: true, allowApiKey: true });
    if (auth instanceof NextResponse) return auth;
    const url = new URL(req.url);
    const concurrency = Number(url.searchParams.get('concurrency')) || 10;
    const limit = url.searchParams.get('limit') ? Number(url.searchParams.get('limit')) : undefined;
    const result = await probeAllChannels({ concurrency, limit });
    return NextResponse.json({ ...result, ok: true, authMethod: auth.authMethod });
  } catch (e: any) {
    console.error('probe-channels error', e);
    return NextResponse.json({ ok: false, error: e.message || String(e) }, { status: 500 });
  }
}
