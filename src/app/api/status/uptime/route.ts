import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const thirtyDaysAgo = new Date();
    thirtyDaysAgo.setDate(thirtyDaysAgo.getDate() - 30);

    const records = await prisma.uptimeRecord.findMany({
      where: { createdAt: { gte: thirtyDaysAgo } },
      orderBy: { createdAt: 'asc' },
    });

    return NextResponse.json(records);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
