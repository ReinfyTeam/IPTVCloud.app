import { NextResponse } from 'next/server';
import { getChannels, paginateChannels } from '@/services/channel-service';

export const dynamic = 'force-dynamic';

export async function GET(request: Request) {
  try {
    const url = new URL(request.url);
    const dataset = await getChannels(false);
    const response = paginateChannels(dataset, {
      q: url.searchParams.get('q') || undefined,
      page: Number(url.searchParams.get('page') || '1'),
      limit: Number(url.searchParams.get('limit') || '50'),
      country: url.searchParams.get('country') || undefined,
      category: url.searchParams.get('category') || undefined,
      language: url.searchParams.get('language') || undefined,
    });

    return NextResponse.json(response);
  } catch (err) {
    return NextResponse.json(
      { items: [], total: 0, fetchedAt: new Date().toISOString(), error: String(err) },
      { status: 500 },
    );
  }
}
