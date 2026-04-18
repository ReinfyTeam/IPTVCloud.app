import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { username: string } }) {
  try {
    const user = await prisma.user.findUnique({
      where: { username: params.username.toLowerCase() },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isVerified: true,
        createdAt: true,
        _count: {
          select: {
            posts: true,
            comments: true,
            favorites: true,
          },
        },
        posts: {
          take: 5,
          orderBy: { createdAt: 'desc' },
          include: {
            _count: { select: { comments: true, likes: true } },
          },
        },
      },
    });

    if (!user) return NextResponse.json({ error: 'User not found' }, { status: 404 });

    return NextResponse.json(user);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
