import { NextResponse } from 'next/server';

export async function POST() {
  // For stateless JWT, logout is handled client-side. This endpoint exists for parity.
  return NextResponse.json({ ok: true });
}
