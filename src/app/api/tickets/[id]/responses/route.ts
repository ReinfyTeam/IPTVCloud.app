import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const responses = await prisma.ticketResponse.findMany({
      where: { ticketId: params.id },
      orderBy: { createdAt: 'asc' },
    });
    return NextResponse.json(responses);
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
