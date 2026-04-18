import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export async function GET(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const tickets = auth.isStaff
      ? await prisma.ticket.findMany({
          include: { user: { select: { email: true, name: true, role: true } } },
          orderBy: { createdAt: 'desc' },
        })
      : await prisma.ticket.findMany({
          where: { userId: user.id },
          orderBy: { createdAt: 'desc' },
        });

    return NextResponse.json(tickets);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch tickets' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { subject, message, type } = await req.json();

    const allowedTypes = ['SUPPORT', 'APPEAL', 'BUG', 'FEATURE'];
    if (!subject || !message || !allowedTypes.includes(type)) {
      return NextResponse.json({ error: 'Invalid or missing fields' }, { status: 400 });
    }

    const ticket = await prisma.ticket.create({
      data: {
        userId: user.id,
        subject,
        message,
        type,
      },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create ticket' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeRequest(req, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, status } = await req.json();
    const ticket = await prisma.ticket.update({
      where: { id },
      data: { status },
    });

    return NextResponse.json(ticket);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update ticket' }, { status: 500 });
  }
}
