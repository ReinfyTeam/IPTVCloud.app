import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import type { AuthPayload, AuthUser } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme';
const ADMIN_ROLE = 'ADMIN';

type AuthorizeOptions = {
  requireAdmin?: boolean;
  allowApiKey?: boolean;
};

type AuthContext = {
  authMethod: 'jwt' | 'api-key';
  isAdmin: boolean;
  user: User | null;
};

function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((value) => value.trim().toLowerCase())
    .filter(Boolean);
}

export function sanitizeUser(
  user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'suspendedAt' | 'suspensionReason'>,
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    suspendedAt: user.suspendedAt?.toISOString() || null,
    suspensionReason: user.suspensionReason || null,
  };
}

export function signToken(user: Pick<User, 'id' | 'role'>) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function hasAdminRole(role?: string | null) {
  return String(role || '').toUpperCase() === ADMIN_ROLE;
}

export function isSuspended(user: Pick<User, 'suspendedAt'> | null | undefined) {
  return Boolean(user?.suspendedAt);
}

export function resolveRegistrationRole(email: string) {
  return getConfiguredAdminEmails().includes(email.trim().toLowerCase()) ? ADMIN_ROLE : 'USER';
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 10);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export function readBearerToken(request: Request) {
  const authorization = request.headers.get('authorization') || '';
  return authorization.startsWith('Bearer ') ? authorization.slice(7) : null;
}

export async function getUserFromRequest(request: Request) {
  const token = readBearerToken(request);
  if (!token) return null;

  try {
    const payload = jwt.verify(token, JWT_SECRET) as AuthPayload;
    return await prisma.user.findUnique({ where: { id: payload.sub } });
  } catch {
    return null;
  }
}

function getApiKeyContext(request: Request): AuthContext | null {
  const configuredKey = process.env.ADMIN_API_KEY;
  const incomingKey = request.headers.get('x-api-key');

  if (!configuredKey || !incomingKey || incomingKey !== configuredKey) {
    return null;
  }

  return {
    authMethod: 'api-key',
    isAdmin: true,
    user: null,
  };
}

export async function authorizeRequest(
  request: Request,
  options: AuthorizeOptions = {},
): Promise<AuthContext | NextResponse> {
  if (options.allowApiKey) {
    const apiKeyContext = getApiKeyContext(request);
    if (apiKeyContext) return apiKeyContext;
  }

  const user = await getUserFromRequest(request);
  if (!user) {
    return NextResponse.json({ ok: false, error: 'Unauthorized' }, { status: 401 });
  }

  if (isSuspended(user)) {
    return NextResponse.json(
      { ok: false, error: user.suspensionReason || 'Account suspended' },
      { status: 403 },
    );
  }

  if (options.requireAdmin && !hasAdminRole(user.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  return {
    authMethod: 'jwt',
    isAdmin: hasAdminRole(user.role),
    user,
  };
}
