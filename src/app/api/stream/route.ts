import { NextResponse } from 'next/server';
import { isLikelyHlsManifest, rewriteHlsManifest } from '@/services/stream-service';
import { decodeBase64Url } from '@/lib/base64';
import { getChannelById } from '@/services/channel-service';

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
    const decoded = decodeBase64Url(key);

    // If decoded looks like a URL, proxy directly
    if (/^https?:\/\//i.test(decoded)) {
      return await proxyRequest(decoded, request);
    }

    // Otherwise, treat as a channel id and attempt to proxy its primary/fallback streams
    const channel = await getChannelById(decoded);
    if (!channel) return NextResponse.json({ error: 'Channel not found' }, { status: 404 });

    const candidates = [channel.streamUrl, ...(channel.fallbackUrls || [])].filter(Boolean);
    for (const candidate of candidates) {
      try {
        const upstream = await fetch(candidate, {
          headers: { 'User-Agent': request.headers.get('User-Agent') || 'Mozilla/5.0' },
          redirect: 'follow',
        });
        if (!upstream.ok) continue;

        const contentType = upstream.headers.get('content-type') || '';
        if (isLikelyHlsManifest(candidate, contentType)) {
          const manifest = await upstream.text();
          return new Response(await rewriteHlsManifest(manifest, candidate), {
            headers: {
              'Content-Type': 'application/vnd.apple.mpegurl',
              'Access-Control-Allow-Origin': '*',
            },
          });
        }

        return new Response(upstream.body, {
          headers: {
            'Content-Type': contentType,
            'Access-Control-Allow-Origin': '*',
            'Cache-Control': 'no-cache',
          },
        });
      } catch (e) {
        // try next candidate
      }
    }

    return NextResponse.json({ error: 'All upstreams failed' }, { status: 502 });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 400 });
  }
}

async function proxyRequest(targetUrl: string, request?: Request) {
  try {
    const upstream = await fetch(targetUrl, {
      headers: { 'User-Agent': request?.headers.get('User-Agent') || 'Mozilla/5.0' },
      redirect: 'follow',
    });

    if (!upstream.ok)
      return NextResponse.json(
        { error: `Upstream failed: ${upstream.status}` },
        { status: upstream.status },
      );

    const contentType = upstream.headers.get('content-type') || '';

    if (isLikelyHlsManifest(targetUrl, contentType)) {
      const manifest = await upstream.text();
      return new Response(await rewriteHlsManifest(manifest, targetUrl), {
        headers: {
          'Content-Type': 'application/vnd.apple.mpegurl',
          'Access-Control-Allow-Origin': '*',
        },
      });
    }

    return new Response(upstream.body, {
      headers: {
        'Content-Type': contentType,
        'Access-Control-Allow-Origin': '*',
        'Cache-Control': 'no-cache',
      },
    });
  } catch (e) {
    return NextResponse.json({ error: String(e) }, { status: 500 });
  }
}
