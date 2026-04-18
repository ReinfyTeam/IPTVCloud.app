import { NextResponse } from 'next/server';
import { authorizeRequest, sanitizeUser } from '@/services/auth-service';

export const dynamic = 'force-dynamic';

export async function GET(req: Request) {
  try {
    const auth = await authorizeRequest(req);
    if (auth instanceof NextResponse) return auth;
    return NextResponse.json({ ok: true, user: sanitizeUser(auth.user!) });
  } catch (error) {
    return NextResponse.json(
      { ok: false, error: error instanceof Error ? error.message : 'Failed.' },
      { status: 500 },
    );
  }
}
