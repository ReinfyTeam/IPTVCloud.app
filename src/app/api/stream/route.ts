import { NextResponse } from 'next/server';
import { isLikelyHlsManifest, rewriteHlsManifest } from '@/services/stream-service';

export const dynamic = 'force-dynamic';
export const runtime = 'nodejs';

export async function OPTIONS() {
  return new Response(null, {
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, User-Agent, Accept',
    },
  });
}

export async function GET(request: Request) {
  const url = new URL(request.url);
  const key = url.searchParams.get('k');

  if (!key) return NextResponse.json({ error: 'Missing key' }, { status: 400 });

  try {
    const decoded = Buffer.from(key.replace(/-/g, '+').replace(/_/g, '/'), 'base64').toString('utf-8');
    if (decoded.startsWith('http')) {
      return await proxyRequest(decoded);
    }
  } catch (e) {
    // Ignore
  }
  
  return NextResponse.json({ error: 'Invalid stream key' }, { status: 400 });
}

async function proxyRequest(targetUrl: string) {
  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': 'Mozilla/5.0' },
      redirect: 'follow'
    });

    if (!upstream.ok) return NextResponse.json({ error: `Upstream failed: ${upstream.status}` }, { status: upstream.status });

    const contentType = upstream.headers.get('content-type') || '';
    
    if (isLikelyHlsManifest(targetUrl, contentType)) {
      const manifest = await upstream.text();
      return new Response(await rewriteHlsManifest(manifest, targetUrl), {
        headers: { 'Content-Type': 'application/vnd.apple.mpegurl', 'Access-Control-Allow-Origin': '*' }
      });
    }

    return new Response(upstream.body, {
      headers: { 'Content-Type': contentType, 'Access-Control-Allow-Origin': '*', 'Cache-Control': 'no-cache' }
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
