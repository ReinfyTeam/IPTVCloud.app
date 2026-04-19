import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const responses = await prisma.ticketResponse.findMany({
      where: { ticketId: params.id },
      include: {
        ticket: {
          select: {
            handledById: true,
          },
        },
      },
      orderBy: { createdAt: 'asc' },
    });

    const mapped = responses.map((res) => ({
      id: res.id,
      message: res.message,
      userId: res.userId,
      createdAt: res.createdAt,
      updatedAt: res.updatedAt,
      isAdminResponse: res.userId === res.ticket.handledById,
    }));
    return NextResponse.json(mapped);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { message } = await req.json();
    if (!message) return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const response = await prisma.ticketResponse.create({
      data: {
        ticketId: params.id,
        userId: auth.user!.id,
        message,
      },
    });

    return NextResponse.json(response);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function PATCH(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { responseId, message } = await req.json();
    if (!message || !responseId)
      return NextResponse.json({ error: 'Message required' }, { status: 400 });

    const response = await prisma.ticketResponse.findUnique({ where: { id: responseId } });
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (response.userId !== auth.user!.id && !auth.isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    const updated = await prisma.ticketResponse.update({
      where: { id: responseId },
      data: { message },
    });

    return NextResponse.json(updated);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function DELETE(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { searchParams } = new URL(req.url);
    const responseId = searchParams.get('responseId');
    if (!responseId) return NextResponse.json({ error: 'Response ID required' }, { status: 400 });

    const response = await prisma.ticketResponse.findUnique({ where: { id: responseId } });
    if (!response) return NextResponse.json({ error: 'Not found' }, { status: 404 });

    if (response.userId !== auth.user!.id && !auth.isStaff) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.ticketResponse.delete({
      where: { id: responseId },
    });

    return NextResponse.json({ success: true });
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
