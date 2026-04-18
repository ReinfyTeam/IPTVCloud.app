import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const { searchParams } = new URL(req.url);
    const sort = searchParams.get('sort') || 'newest';

    let orderBy: any = { createdAt: 'desc' };
    if (sort === 'oldest') orderBy = { createdAt: 'asc' };
    if (sort === 'likes') orderBy = { likes: { _count: 'desc' } };
    if (sort === 'comments') orderBy = { comments: { _count: 'desc' } };

    const posts = await prisma.post.findMany({
      include: {
        user: { select: { username: true, name: true, isVerified: true, role: true } },
        _count: { select: { comments: true, likes: true } },
      },
      orderBy,
    });

    return NextResponse.json(posts);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch posts' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;

    const { title, content } = await req.json();
    if (!title || !content)
      return NextResponse.json({ error: 'Title and content are required.' }, { status: 400 });

    const post = await prisma.post.create({
      data: {
        userId: auth.user!.id,
        title,
        content,
      },
      include: {
        user: { select: { username: true, name: true, isVerified: true, role: true } },
      },
    });

    return NextResponse.json(post);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to create post.' }, { status: 500 });
  }
}
