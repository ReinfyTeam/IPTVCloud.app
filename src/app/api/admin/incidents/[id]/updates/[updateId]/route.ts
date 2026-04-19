import { NextResponse } from 'next/server';
import prisma from '@/lib/prisma';
import { authorizeRequest } from '@/services/auth-service';

export async function PATCH(
  req: Request,
  { params }: { params: { id: string; updateId: string } },
) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    const { message, status } = await req.json();

    const update = await prisma.incidentUpdate.update({
      where: { id: params.updateId },
      data: {
        ...(message ? { message } : {}),
        ...(status ? { status } : {}),
      },
    });

    return NextResponse.json(update);
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}

export async function DELETE(
  req: Request,
  { params }: { params: { id: string; updateId: string } },
) {
  try {
    const auth = await authorizeRequest(req, { requireStaff: true });
    if (auth instanceof NextResponse) return auth;

    await prisma.incidentUpdate.delete({
      where: { id: params.updateId },
    });

    return NextResponse.json({ success: true });
  } catch (error: any) {
    return NextResponse.json({ error: error.message }, { status: 500 });
  }
}
