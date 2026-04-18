import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromReq as verifyAuth } from '@/lib/auth';

export async function GET(request: Request) {
  const user = await verifyAuth(request);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      role: true,
      suspendedAt: true,
      createdAt: true,
    },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const user = await verifyAuth(request);
  if (!user || user.role !== 'ADMIN') {
    return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });
  }

  const { userId, action, reason } = await request.json();

  if (action === 'SUSPEND') {
    await prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: new Date(), suspensionReason: reason },
    });
  } else if (action === 'UNSUSPEND') {
    await prisma.user.update({
      where: { id: userId },
      data: { suspendedAt: null, suspensionReason: null },
    });
  }

  return NextResponse.json({ success: true });
}
