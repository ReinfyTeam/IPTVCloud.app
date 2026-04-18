import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { message, status } = await req.json();
    if (!message || !status)
      return NextResponse.json({ error: 'Message and status required' }, { status: 400 });

    const update = await prisma.incidentUpdate.create({
      data: {
        incidentId: params.id,
        message,
        status,
      },
    });

    // Also update parent incident status
    await prisma.incident.update({
      where: { id: params.id },
      data: { status, resolvedAt: status === 'RESOLVED' ? new Date() : undefined },
    });

    return NextResponse.json(update);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
