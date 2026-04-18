import { NextResponse } from 'next/server';
import { clearTokenCookie } from '@/lib/cookies';

export async function POST() {
  const response = NextResponse.json({ ok: true });
  return clearTokenCookie(response);
}
