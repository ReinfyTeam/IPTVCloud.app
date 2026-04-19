import { NextResponse } from 'next/server';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const range = searchParams.get('range') || 'hour'; // hour, month, year

    let points = 24;
    let multiplier = 1;
    if (range === 'hour') {
      points = 60;
      multiplier = 1;
    }
    if (range === 'month') {
      points = 30;
      multiplier = 24;
    }
    if (range === 'year') {
      points = 12;
      multiplier = 30 * 24;
    }

    const data = [];
    const now = new Date();

    for (let i = points; i >= 0; i--) {
      const d = new Date(now);
      if (range === 'hour') d.setMinutes(d.getMinutes() - i);
      if (range === 'month') d.setDate(d.getDate() - i);
      if (range === 'year') d.setMonth(d.getMonth() - i);

      // Generate somewhat realistic-looking variations
      const baseViewers = 5000 + Math.sin(i * 0.5) * 2000 + Math.random() * 500;
      const activeStreams = 8000 + Math.cos(i * 0.3) * 100 + Math.random() * 50;
      const downStreams = Math.max(0, 20 + Math.sin(i * 0.8) * 15 + Math.random() * 10);
      const watchingUsers = baseViewers * 0.8 + Math.random() * 200;
      const latency = 45 + Math.sin(i * 0.4) * 20 + Math.random() * 10;

      data.push({
        time: d.toISOString(),
        viewers: Math.round(baseViewers),
        activeStreams: Math.round(activeStreams),
        downStreams: Math.round(downStreams),
        watchingUsers: Math.round(watchingUsers),
        latency: Math.round(latency),
      });
    }

    return NextResponse.json(data);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
