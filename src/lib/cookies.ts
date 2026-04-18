import { NextResponse } from 'next/server';
import type { NextRequest } from 'next/server';

export const TOKEN_COOKIE = 'iptv_token';
const COOKIE_MAX_AGE = 60 * 60 * 24 * 7; // 7 days

export function setTokenCookie(response: NextResponse, token: string): NextResponse {
  response.cookies.set(TOKEN_COOKIE, token, {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: COOKIE_MAX_AGE,
    path: '/',
  });
  return response;
}

export function clearTokenCookie(response: NextResponse): NextResponse {
  response.cookies.set(TOKEN_COOKIE, '', {
    httpOnly: true,
    secure: process.env.NODE_ENV === 'production',
    sameSite: 'lax',
    maxAge: 0,
    path: '/',
  });
  return response;
}

export function getTokenFromRequest(request: Request | NextRequest): string | null {
  // Check httpOnly cookie first
  const cookieHeader = request.headers.get('cookie') || '';
  const match = cookieHeader.match(new RegExp(`(?:^|;\\s*)${TOKEN_COOKIE}=([^;]+)`));
  if (match?.[1]) return match[1];

  // Fallback to Authorization header
  const authorization = request.headers.get('authorization') || '';
  if (authorization.startsWith('Bearer ')) return authorization.slice(7);

  return null;
}
