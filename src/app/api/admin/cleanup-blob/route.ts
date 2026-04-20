import { NextResponse } from 'next/server';
import db from '@/lib/db';
import { del } from '@vercel/blob';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireAdmin: true });
    if (auth instanceof NextResponse) return auth;

    // Find expired attachments
    const now = new Date();
    const expiredRes = await db.query('SELECT * FROM "Attachment" WHERE "expiresAt" < $1', [now]);
    const expired = expiredRes.rows;

    if (expired.length === 0) {
      return NextResponse.json({ message: 'No expired blobs found.' });
    }

    // Delete from Vercel Blob
    for (const asset of expired) {
      try {
        await del(asset.url);
      } catch (e) {
        console.error(`Failed to delete blob: ${asset.url}`, e);
      }
    }

    // Delete from DB
    await db.query('DELETE FROM "Attachment" WHERE id = ANY($1)', [expired.map((a) => a.id)]);

    return NextResponse.json({
      message: `Cleaned up ${expired.length} expired blobs.`,
      deleted: expired.map((a) => a.filename),
    });
  } catch (error) {
    console.error('Cleanup failed:', error);
    return NextResponse.json({ error: 'Cleanup failed' }, { status: 500 });
  }
}
