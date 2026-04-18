import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const q = searchParams.get('q') || '';
    const limit = parseInt(searchParams.get('limit') || '10');

    const users = await prisma.user.findMany({
      where: {
        OR: [
          { username: { contains: q, mode: 'insensitive' } },
          { name: { contains: q, mode: 'insensitive' } },
        ],
      },
      select: {
        id: true,
        username: true,
        name: true,
        role: true,
        isVerified: true,
      },
      take: limit,
    });

    return NextResponse.json(users);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
