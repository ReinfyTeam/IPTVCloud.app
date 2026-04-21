import { NextResponse } from 'next/server';
import { authorizeRequest } from '@/services/auth-service';
import { put } from '@vercel/blob';
import { getProxiedBlobUrl } from '@/lib/blob-proxy';
import sharp from 'sharp';

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

    let buffer: any = Buffer.from(await file.arrayBuffer());
    let fileName = file.name;

    if (isImage && !contentType.includes('gif')) {
      // Compress image
      buffer = await sharp(buffer as Buffer)
        .resize(1920, 1920, { fit: 'inside', withoutEnlargement: true })
        .jpeg({ quality: 80, progressive: true })
        .toBuffer();
      fileName = fileName.replace(/\.[^/.]+$/, '') + '.jpg';
    }

    // Size limits in bytes
    const LIMIT = 50 * 1024 * 1024; // 50MB global limit after compression

    if (buffer.length > LIMIT) {
      return NextResponse.json({ error: 'File too large (max 50MB)' }, { status: 400 });
    }

    // Upload to Vercel Blob
    const blob = await put(fileName, buffer, {
      access: 'public',
      contentType: isImage && !contentType.includes('gif') ? 'image/jpeg' : contentType,
    });

    const type = isImage ? 'IMAGE' : isVideo ? 'VIDEO' : 'FILE';
    const proxiedUrl = getProxiedBlobUrl(
      blob.url,
      isImage ? 'image' : isVideo ? 'video' : 'attachment',
    );

    return NextResponse.json({
      url: proxiedUrl,
      originalUrl: blob.url,
      filename: fileName,
      type,
    });
  } catch (error) {
    console.error('Upload error:', error);
    return NextResponse.json({ error: 'Upload failed' }, { status: 500 });
  }
}
