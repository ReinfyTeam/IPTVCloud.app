import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromReq as verifyAuth } from '@/lib/auth';

export async function DELETE(request: Request) {
  const user = await verifyAuth(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    await prisma.user.delete({
      where: { id: user.id },
    });
    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to delete account' }, { status: 500 });
  }
}
