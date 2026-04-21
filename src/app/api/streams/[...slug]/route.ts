import { NextRequest, NextResponse } from 'next/server';
import { getChannelById } from '@/services/channel-service';
import {
  isLikelyHlsManifest,
  rewriteHlsManifest,
  resolveStreamUrl,
} from '@/services/stream-service';
import { validateUrlForProxy } from '@/lib/ssrf';

export const dynamic = 'force-dynamic';

export async function GET(req: NextRequest, { params }: { params: Promise<{ slug: string[] }> }) {
  if (!(await params).slug || (await params).slug.length === 0) {
    return new NextResponse('Missing stream URL', { status: 400 });
  }

  try {
    const encoded = (await params).slug.join('/');
    const decoded = await resolveStreamUrl(encoded);
    if (!decoded) return new NextResponse('Invalid key', { status: 400 });

    let response: Response | null = null;
    let usedUrl = decoded;

    // If decoded value is not an HTTP URL, treat it as a channel id and try the channel's streams
    if (!/^https?:\/\//i.test(decoded)) {
      const channel = await getChannelById(decoded);
      if (!channel) return new NextResponse('Channel not found', { status: 404 });

      const candidates = [channel.streamUrl, ...(channel.fallbackUrls || [])].filter(Boolean);
      for (const candidate of candidates) {
        if (!validateUrlForProxy(candidate)) continue;
        try {
          const urlObj = new URL(candidate);
          const r = await fetch(urlObj, {
            headers: {
              'User-Agent': req.headers.get('User-Agent') || 'IPTVCloud-Proxy/1.0',
              Range: req.headers.get('Range') || '',
            },
            redirect: 'follow',
          });
          if (r.ok) {
            response = r;
            usedUrl = candidate;
            break;
          }
        } catch (e) {
          // try next candidate
        }
      }

      if (!response) {
        return new NextResponse('All upstreams failed', { status: 502 });
      }
    } else {
      // Decoded is an URL
      usedUrl = decoded;
      if (!validateUrlForProxy(usedUrl)) {
        return new NextResponse('Invalid or blocked URL', { status: 400 });
      }

      const urlObj = new URL(usedUrl);
      if (!['http:', 'https:', 'rtmp:'].includes(urlObj.protocol)) {
        return new NextResponse('Invalid protocol', { status: 400 });
      }

      response = await fetch(urlObj, {
        headers: {
          'User-Agent': req.headers.get('User-Agent') || 'IPTVCloud-Proxy/1.0',
          Range: req.headers.get('Range') || '',
        },
        redirect: 'follow',
      });

      if (!response.ok) {
        return new NextResponse(response.statusText, { status: response.status });
      }
    }

    // At this point `response` is a successful upstream response and `usedUrl` is the upstream URL used
    const contentType = response.headers.get('content-type') || '';

    // If manifest, rewrite nested URIs
    if (isLikelyHlsManifest(usedUrl, contentType)) {
      const manifest = await response.text();
      const rewritten = await rewriteHlsManifest(manifest, usedUrl);
      const headers = new Headers();
      headers.set('Content-Type', 'application/vnd.apple.mpegurl');
      headers.set('Access-Control-Allow-Origin', '*');
      headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
      headers.set('Access-Control-Allow-Headers', 'Range, User-Agent, Accept');
      return new NextResponse(rewritten, { status: 200, headers });
    }

    const headers = new Headers(response.headers);
    headers.set('Access-Control-Allow-Origin', '*');
    headers.set('Access-Control-Allow-Methods', 'GET, OPTIONS');
    headers.set('Access-Control-Allow-Headers', 'Range, User-Agent, Accept');

    return new NextResponse(response.body, {
      status: response.status,
      statusText: response.statusText,
      headers,
    });
  } catch (error) {
    console.error('[STREAM_PROXY_ERROR]', error);
    return new NextResponse('Error proxying stream', { status: 500 });
  }
}

export async function OPTIONS() {
  return new NextResponse(null, {
    status: 204,
    headers: {
      'Access-Control-Allow-Origin': '*',
      'Access-Control-Allow-Methods': 'GET, OPTIONS',
      'Access-Control-Allow-Headers': 'Range, User-Agent, Accept',
    },
  });
}
