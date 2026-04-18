import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const incident = await prisma.incident.findUnique({
      where: { id: params.id },
      include: { updates: { orderBy: { createdAt: 'desc' } } },
    });
    if (!incident) return NextResponse.json({ error: 'Incident not found' }, { status: 404 });
    return NextResponse.json(incident);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
