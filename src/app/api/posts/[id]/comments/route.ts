import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request, { params }: { params: { id: string } }) {
  try {
    const comments = await prisma.postComment.findMany({
      where: { postId: params.id },
      include: {
        user: { select: { id: true, username: true, name: true, isVerified: true, role: true } },
      },
      orderBy: { createdAt: 'desc' },
    });
    return NextResponse.json(comments);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { content } = await req.json();
    if (!content) return NextResponse.json({ error: 'Content is required.' }, { status: 400 });

    const comment = await prisma.postComment.create({
      data: {
        postId: params.id,
        userId: auth.user!.id,
        content,
      },
      include: {
        user: { select: { id: true, username: true, name: true, isVerified: true, role: true } },
      },
    });

    return NextResponse.json(comment);
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
