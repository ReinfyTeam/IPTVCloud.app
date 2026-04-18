export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  name?: string | null;
  role: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  lastUsernameChange: string | null;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  isMuted?: boolean;
  isRestricted?: boolean;
  createdAt: string;
}

export interface AuthPayload {
  sub: string;
  role: string;
  iat?: number;
  exp?: number;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface RegisterRequest {
  email: string;
  username: string;
  password: string;
  name?: string;
}

export interface AuthResponse {
  ok: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}
