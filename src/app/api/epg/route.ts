import { NextResponse } from 'next/server';

// Proxy EPG data from iptv-org
// This handles fetching and basic caching of EPG data.
export async function GET(req: Request) {
  const { searchParams } = new URL(req.url);
  const site = searchParams.get('site');

  if (!site || !/^[a-z0-9-]+$/.test(site)) {
    return NextResponse.json({ error: 'Invalid site parameter' }, { status: 400 });
  }

  try {
    // Fetches from iptv-org EPG data
    const res = await fetch(`https://iptv-org.github.io/api/guides/${site}.json`, {
      next: { revalidate: 3600 }, // Cache for 1 hour
    });

    if (!res.ok) {
      return NextResponse.json({ error: 'EPG data not found' }, { status: 404 });
    }

    const data = await res.json();
    return NextResponse.json(data);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch EPG data' }, { status: 500 });
  }
}
