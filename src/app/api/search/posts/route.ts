import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const posts = await prisma.post.findMany({
      where: {
        OR: [
          { title: { contains: q, mode: 'insensitive' } },
          { content: { contains: q, mode: 'insensitive' } },
        ],
      },
      include: {
        user: { select: { username: true, isVerified: true } },
        _count: { select: { comments: true, likes: true } },
      },
      take: limit,
      orderBy: { createdAt: 'desc' },
    });

    return NextResponse.json(posts);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
