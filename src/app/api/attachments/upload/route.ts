import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import { put } from '@vercel/blob';
import { getProxiedBlobUrl } from '@/lib/blob-proxy';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const formData = await req.formData();
    const file = formData.get('file') as File | null;

    if (!file) {
      return NextResponse.json({ error: 'No file uploaded' }, { status: 400 });
    }

    const contentType = file.type;
    const isImage = contentType.startsWith('image/');
    const isVideo = contentType.startsWith('video/');

    // Size limits in bytes
    const IMAGE_LIMIT = 20 * 1024 * 1024; // 20MB
    const VIDEO_LIMIT = 200 * 1024 * 1024; // 200MB
    const ATTACHMENT_LIMIT = 100 * 1024 * 1024; // 100MB

    if (isImage && file.size > IMAGE_LIMIT) {
      return NextResponse.json({ error: 'Image too large (max 20MB)' }, { status: 400 });
    }
    if (isVideo && file.size > VIDEO_LIMIT) {
      return NextResponse.json({ error: 'Video too large (max 200MB)' }, { status: 400 });
    }
    if (!isImage && !isVideo && file.size > ATTACHMENT_LIMIT) {
      return NextResponse.json({ error: 'File too large (max 100MB)' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(file.name, file, {
      access: 'public',
    });

    // Calculate expiry for videos (5 years)
    let expiresAt: Date | null = null;
    if (isVideo) {
      expiresAt = new Date();
      expiresAt.setFullYear(expiresAt.getFullYear() + 5);
    }

    const type = isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE';
    const proxiedUrl = getProxiedBlobUrl(
      blob.url,
      isImage ? 'image' : isVideo ? 'video' : 'attachment',
    );

    return NextResponse.json({
      url: proxiedUrl,
      originalUrl: blob.url,
      filename: file.name,
      type,
      expiresAt,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
