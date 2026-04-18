import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'newest';
    const filterType = searchParams.get('type');
    const archived = searchParams.get('archived') === 'true';

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'type') orderBy = { type: 'asc' };
    if (sort === 'name') orderBy = { user: { username: 'asc' } };

    const tickets = await prisma.ticket.findMany({
      where: {
        isArchived: archived,
        ...(filterType ? { type: filterType } : {}),
      },
      include: {
        user: { select: { email: true, name: true, role: true, username: true } },
        handledBy: { select: { name: true, username: true } },
      },
      orderBy,
    });

    return NextResponse.json(tickets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { subject, message, type } = await req.json();

    const allowedTypes = ['SUPPORT', 'APPEAL', 'BUG', 'FEATURE'];
    if (!subject || !message || !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid or missing fields' }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: auth.user!.id,
        subject,
        message,
        type,
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { id, status, handledById, isArchived } = await req.json();
    if (!id) return NextResponse.json({ error: 'ID required' }, { status: 400 });

    const ticket = await prisma.ticket.update({
      where: { id },
      data: {
        ...(status ? { status } : {}),
        ...(handledById ? { handledById } : {}),
        ...(isArchived !== undefined ? { isArchived } : {}),
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
