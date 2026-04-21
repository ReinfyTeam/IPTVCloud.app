import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';
import * as jwt from 'jsonwebtoken';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-set-JWT_SECRET-env';

export async function proxy(request: NextRequest) {
  const token = request.cookies.get('iptv_token')?.value;

  if (token) {
    try {
      // Note: We can't easily query DB in middleware without potentially slowing down every request
      // or hitting connection limits if using a standard Pool.
      // But we can check the JWT payload if we store the restriction status there.
      // For now, let's assume we might need a server-side check on specific pages or a fast cache.
      // However, the simplest way is to check the user status in the RootLayout or a dedicated Client Component.
      // Let's stick to the Plan: Root Layout check.
    } catch (e) {
      // invalid token
    }
  }

  return NextResponse.next();
}

export const config = {
  matcher: [
    /*
     * Match all request paths except for the ones starting with:
     * - api (API routes)
     * - _next/static (static files)
     * - _next/image (image optimization files)
     * - favicon.ico (favicon file)
     */
    '/((?!api|_next/static|_next/image|favicon.ico).*)',
  ],
};
