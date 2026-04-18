import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET() {
  try {
    const incidents = await prisma.incident.findMany({
      include: { updates: { orderBy: { createdAt: 'desc' } } },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(incidents);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { action, id, title, description, status, severity, tags } = await req.json();

    if (action === 'CREATE') {
      const incident = await prisma.incident.create({
        data: {
          title,
          description,
          status: status || 'INVESTIGATING',
          severity: severity || 'LOW',
          tags: tags || [],
        },
      });
      return NextResponse.json({ success: true, incident });
    }

    if (action === 'UPDATE') {
      const resolvedAt = status === 'RESOLVED' ? new Date() : null;
      const incident = await prisma.incident.update({
        where: { id },
        data: {
          ...(title ? { title } : {}),
          ...(description ? { description } : {}),
          status,
          severity,
          tags,
          resolvedAt,
        },
      });
      return NextResponse.json({ success: true, incident });
    }

    if (action === 'DELETE') {
      await prisma.incident.delete({ where: { id } });
      return NextResponse.json({ success: true });
    }

    return NextResponse.json({ error: 'Invalid action' }, { status: 400 });
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
