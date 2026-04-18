import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromReq } from '@/lib/auth';

export async function POST(request: Request) {
  const user = await getUserFromReq(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { email } = await request.json();
    if (!email || !email.includes('@')) {
      return NextResponse.json({ error: 'Invalid email address' }, { status: 400 });
    }

    const existing = await prisma.user.findUnique({ where: { email } });
    if (existing) {
      return NextResponse.json({ error: 'Email already in use' }, { status: 400 });
    }

    await prisma.user.update({
      where: { id: user.id },
      data: { email },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update email' }, { status: 500 });
  }
}
