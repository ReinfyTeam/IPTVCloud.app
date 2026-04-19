import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest, hashPassword } from '@/services/auth-service';

export async function GET(request: Request) {
  const auth = await authorizeRequest(request, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  const url = new URL(request.url);
  const q = url.searchParams.get('q') || '';
  const page = parseInt(url.searchParams.get('page') || '1');
  const limit = parseInt(url.searchParams.get('limit') || '50');
  const skip = (page - 1) * limit;

  let where = {};
  if (q) {
    where = {
      OR: [
        { email: { contains: q, mode: 'insensitive' } },
        { username: { contains: q, mode: 'insensitive' } },
        { name: { contains: q, mode: 'insensitive' } },
        { id: { equals: q } },
      ],
    };
  }

  const [users, total] = await Promise.all([
    prisma.user.findMany({
      where,
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
        twoFactorEnabled: true,
      },
      orderBy: { createdAt: 'desc' },
      skip,
      take: limit,
    }),
    prisma.user.count({ where }),
  ]);

  return NextResponse.json({ users, total, page, limit });
}

export async function POST(request: Request) {
  const auth = await authorizeRequest(request, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  const body = await request.json();
  const { userId, action, reason, value } = body;

  try {
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
        data: { isMuted: true, muteExpiresAt: new Date(Date.now() + 24 * 60 * 60 * 1000) },
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
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await prisma.user.update({ where: { id: userId }, data: { role: value } });
    } else if (action === 'SET_VERIFIED') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await prisma.user.update({
        where: { id: userId },
        data: { isVerified: value, verifiedAt: value ? new Date() : null },
      });
    } else if (action === 'DELETE') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await prisma.user.delete({ where: { id: userId } });
    } else if (action === 'RESET_PASSWORD') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      const newPassword = value || Math.random().toString(36).slice(-8);
      const hashedPassword = await hashPassword(newPassword);
      await prisma.user.update({
        where: { id: userId },
        data: { password: hashedPassword, forcePasswordReset: true },
      });
      return NextResponse.json({ success: true, newPassword });
    } else if (action === 'CHANGE_EMAIL') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await prisma.user.update({ where: { id: userId }, data: { email: value } });
    } else if (action === 'CHANGE_USERNAME') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await prisma.user.update({ where: { id: userId }, data: { username: value } });
    } else if (action === 'CHANGE_NAME') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await prisma.user.update({ where: { id: userId }, data: { name: value } });
    } else if (action === 'RESET_2FA') {
      if (!auth.isAdmin)
        return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
      await prisma.user.update({
        where: { id: userId },
        data: { twoFactorEnabled: false, twoFactorSecret: null },
      });
    }

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ ok: false, error: error.message }, { status: 500 });
  }
}
