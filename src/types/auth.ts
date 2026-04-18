export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
  isMuted?: boolean;
  isRestricted?: boolean;
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
  password: string;
  name?: string;
}

export interface AuthResponse {
  ok: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}
