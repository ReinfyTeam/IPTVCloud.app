import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromReq } from '@/lib/auth';

export async function GET() {
  try {
    const incidents = await prisma.incident.findMany({
      orderBy: { createdAt: 'desc' },
      take: 20,
    });
    return NextResponse.json(incidents);
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const user = await getUserFromReq(req);
    if (!user || user.role !== 'ADMIN')
      return NextResponse.json({ error: 'Unauthorized' }, { status: 403 });

    const { action, id, title, description, status } = await req.json();

    if (action === 'CREATE') {
      const incident = await prisma.incident.create({
        data: { title, description, status },
      });
      return NextResponse.json({ success: true, incident });
    }

    if (action === 'UPDATE') {
      const resolvedAt = status === 'RESOLVED' ? new Date() : null;
      const incident = await prisma.incident.update({
        where: { id },
        data: { title, description, status, resolvedAt },
      });
      return NextResponse.json({ success: true, incident });
    }

    if (action === 'DELETE') {
      await prisma.incident.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: String(error) }, { status: 500 });
  }
}
