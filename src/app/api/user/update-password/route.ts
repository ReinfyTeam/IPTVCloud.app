import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { getUserFromRequest, verifyPassword, hashPassword } from '@/services/auth-service';

export async function POST(request: Request) {
  const user = await getUserFromRequest(request);
  if (!user) return NextResponse.json({ error: 'Unauthorized' }, { status: 401 });

  try {
    const { currentPassword, newPassword } = await request.json();
    
    if (!currentPassword || !newPassword) {
      return NextResponse.json({ error: 'Missing password fields' }, { status: 400 });
    }

    const isValid = await verifyPassword(currentPassword, user.password);
    if (!isValid) {
      return NextResponse.json({ error: 'Incorrect current password' }, { status: 400 });
    }

    const hashedPassword = await hashPassword(newPassword);
    await prisma.user.update({
      where: { id: user.id },
      data: { password: hashedPassword },
    });

    return NextResponse.json({ success: true });
  } catch (error) {
    return NextResponse.json({ error: 'Failed to update password' }, { status: 500 });
  }
}
