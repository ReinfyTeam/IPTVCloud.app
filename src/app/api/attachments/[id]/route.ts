import { NextResponse } from 'next/server';
import { decodeProxiedBlobUrl } from '@/lib/blob-proxy';
import { validateUrlForProxy } from '@/lib/ssrf';

export const dynamic = 'force-dynamic';

export async function GET(_: Request, { params }: { params: Promise<{ id: string }> }) {
  try {
    const targetUrl = decodeProxiedBlobUrl((await params).id);
    if (!targetUrl || !validateUrlForProxy(targetUrl)) {
      return new Response('Invalid or blocked ID', { status: 400 });
    }

    const res = await fetch(targetUrl);
    if (!res.ok) return new Response('Failed to fetch attachment', { status: res.status });

    const headers = new Headers();
    headers.set('Content-Type', res.headers.get('Content-Type') || 'application/octet-stream');
    headers.set('Content-Disposition', res.headers.get('Content-Disposition') || 'attachment');
    if (res.headers.get('Content-Length')) {
      headers.set('Content-Length', res.headers.get('Content-Length')!);
    }

    return new Response(res.body, { headers });
  } catch (error) {
    return new Response('Server Error', { status: 500 });
  }
}
