import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export async function GET(req: Request) {
  const url = new URL(req.url);
  const channelId = url.searchParams.get('channelId');

  if (!channelId) return NextResponse.json({ error: 'Missing channelId' }, { status: 400 });

  try {
    const comments = await prisma.comment.findMany({
      where: { channelId },
      include: { user: { select: { id: true, name: true, email: true, role: true } } },
      orderBy: [
        { isPinned: 'desc' },
        { createdAt: 'desc' }
      ],
      take: 50,
    });

    return NextResponse.json(comments);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to fetch comments' }, { status: 500 });
  }
}

export async function POST(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  if (user.isMuted && user.muteExpiresAt && user.muteExpiresAt > new Date()) {
    return NextResponse.json({ error: 'You are muted until ' + user.muteExpiresAt.toLocaleString() }, { status: 403 });
  }

  try {
    const { channelId, text } = await req.json();

    if (!text || text.length > 500) {
      return NextResponse.json({ error: 'Invalid comment text' }, { status: 400 });
    }

    // Link filtering for non-admins
    if (!auth.isAdmin && /(https?:\/\/[^\s]+)/g.test(text)) {
      return NextResponse.json({ error: 'Links are not allowed for non-admin users' }, { status: 403 });
    }

    const comment = await prisma.comment.create({
      data: {
        userId: user.id,
        channelId,
        text,
      },
      include: { user: { select: { id: true, name: true, email: true, role: true } } }
    });

    return NextResponse.json(comment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to post comment' }, { status: 500 });
  }
}

export async function DELETE(req: Request) {
  const auth = await authorizeRequest(req);
  if (auth instanceof NextResponse) return auth;

  const { user } = auth;
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { id } = await req.json();
    const comment = await prisma.comment.findUnique({ where: { id } });

    if (!comment) return NextResponse.json({ error: 'Comment not found' }, { status: 404 });

    // Allow staff/admin or owner to delete
    if (!auth.isStaff && comment.userId !== user.id) {
      return NextResponse.json({ error: 'Forbidden' }, { status: 403 });
    }

    await prisma.comment.delete({ where: { id } });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete comment' }, { status: 500 });
  }
}

export async function PATCH(req: Request) {
  const auth = await authorizeRequest(req, { requireStaff: true });
  if (auth instanceof NextResponse) return auth;

  try {
    const { id, isPinned } = await req.json();
    const comment = await prisma.comment.update({
      where: { id },
      data: { isPinned },
    });

    return NextResponse.json(comment);
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update comment' }, { status: 500 });
  }
}
