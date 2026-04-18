import bcrypt from 'bcryptjs';
import jwt from 'jsonwebtoken';
import { NextResponse } from 'next/server';
import type { User } from '@prisma/client';
import prisma from '@/lib/prisma';
import { getTokenFromRequest } from '@/lib/cookies';
import type { AuthPayload, AuthUser } from '@/types';

const JWT_SECRET = process.env.JWT_SECRET || 'changeme-set-JWT_SECRET-env';
const ADMIN_ROLE = 'ADMIN';
const STAFF_ROLE = 'STAFF';

type AuthorizeOptions = {
  requireAdmin?: boolean;
  requireStaff?: boolean;
  allowApiKey?: boolean;
};

type AuthContext = {
  authMethod: 'jwt' | 'api-key';
  isAdmin: boolean;
  isStaff: boolean;
  user: User | null;
};

function getConfiguredAdminEmails() {
  return (process.env.ADMIN_EMAILS || '')
    .split(',')
    .map((v) => v.trim().toLowerCase())
    .filter(Boolean);
}

export function sanitizeUser(
  user: Pick<User, 'id' | 'email' | 'name' | 'role' | 'suspendedAt' | 'suspensionReason' | 'isMuted' | 'isRestricted'>,
): AuthUser {
  return {
    id: user.id,
    email: user.email,
    name: user.name,
    role: user.role,
    suspendedAt: user.suspendedAt?.toISOString() || null,
    suspensionReason: user.suspensionReason || null,
    isMuted: user.isMuted,
    isRestricted: user.isRestricted,
  };
}

export function signToken(user: Pick<User, 'id' | 'role'>) {
  return jwt.sign({ sub: user.id, role: user.role }, JWT_SECRET, { expiresIn: '7d' });
}

export function hasAdminRole(role?: string | null) {
  return String(role || '').toUpperCase() === ADMIN_ROLE;
}

export function hasStaffRole(role?: string | null) {
  const r = String(role || '').toUpperCase();
  return r === STAFF_ROLE || r === ADMIN_ROLE;
}

export function isSuspended(user: Pick<User, 'suspendedAt'> | null | undefined) {
  return Boolean(user?.suspendedAt);
}

export function resolveRegistrationRole(email: string) {
  return getConfiguredAdminEmails().includes(email.trim().toLowerCase()) ? ADMIN_ROLE : 'USER';
}

export async function hashPassword(password: string) {
  return bcrypt.hash(password, 12);
}

export async function verifyPassword(password: string, hash: string) {
  return bcrypt.compare(password, hash);
}

export async function getUserFromRequest(request: Request): Promise<User | null> {
  const token = getTokenFromRequest(request);
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

  if (!configuredKey || !incomingKey || incomingKey !== configuredKey) return null;

  return { authMethod: 'api-key', isAdmin: true, isStaff: true, user: null };
}

export async function authorizeRequest(
  request: Request,
  options: AuthorizeOptions = {},
): Promise<AuthContext | NextResponse> {
  if (options.allowApiKey) {
    const apiKeyCtx = getApiKeyContext(request);
    if (apiKeyCtx) return apiKeyCtx;
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

  if (options.requireStaff && !hasStaffRole(user.role)) {
    return NextResponse.json({ ok: false, error: 'Forbidden' }, { status: 403 });
  }

  return {
    authMethod: 'jwt',
    isAdmin: hasAdminRole(user.role),
    isStaff: hasStaffRole(user.role),
    user,
  };
}
