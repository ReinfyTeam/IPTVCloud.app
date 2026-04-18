import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  const users = await prisma.user.findMany({
    select: {
      id: true,
      email: true,
      username: true,
      name: true,
      role: true,
      isVerified: true,
      suspendedAt: true,
      isMuted: true,
      isRestricted: true,
      createdAt: true,
    },
    orderBy: { createdAt: 'desc' },
  });

  return NextResponse.json(users);
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { userId, action, reason, value } = body;

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
  } else if (action === 'MUTE') {
    await prisma.user.update({
      where: { id: userId },
      data: { isMuted: true, muteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) }, // Default 24h
    });
  } else if (action === 'UNMUTE') {
    await prisma.user.update({
      where: { id: userId },
      data: { isMuted: false, muteExpiresAt: null },
    });
  } else if (action === 'RESTRICT') {
    await prisma.user.update({
      where: { id: userId },
      data: { isRestricted: true },
    });
  } else if (action === 'UNRESTRICT') {
    await prisma.user.update({
      where: { id: userId },
      data: { isRestricted: false },
    });
  } else if (action === 'SET_ROLE') {
    // Only admins can change roles
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { role: value },
    });
  } else if (action === 'SET_VERIFIED') {
    // Only admins can set verified status
    if (!auth.isAdmin) {
      return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
    }
    await prisma.user.update({
      where: { id: userId },
      data: { isVerified: value, verifiedAt: value ? new Date() : null },
    });
  }

  return NextResponse.json({ success: true });
}
