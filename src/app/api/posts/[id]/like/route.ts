import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function POST(req: Request, { params }: { params: { id: string } }) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const existing = await prisma.postLike.findUnique({
      where: { postId_userId: { postId: params.id, userId: auth.user!.id } },
    });

    if (existing) {
      await prisma.postLike.delete({
        where: { postId_userId: { postId: params.id, userId: auth.user!.id } },
      });
      return NextResponse.json({ liked: false });
    } else {
      await prisma.postLike.create({
        data: { postId: params.id, userId: auth.user!.id },
      });
      return NextResponse.json({ liked: true });
    }
  } catch {
    return NextResponse.json({ error: 'Failed' }, { status: 500 });
  }
}
