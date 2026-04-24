export interface AuthUser {
  id: string;
  email: string;
  username: string | null;
  name?: string | null;
  firstName?: string | null;
  lastName?: string | null;
  middleInitial?: string | null;
  suffix?: string | null;
  bio?: string | null;
  about?: string | null;
  profileIcon?: string | null;
  profileIconUrl?: string | null;
  privacySettings?: string | null;
  notificationSettings?: string | null;
  role: string;
  isVerified: boolean;
  twoFactorEnabled: boolean;
  lastUsernameChange: string | null;
  isShadowBanned: boolean;
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
  firstName?: string;
  lastName?: string;
  middleInitial?: string;
  suffix?: string;
}

export interface AuthResponse {
  ok: boolean;
  user?: AuthUser;
  token?: string;
  error?: string;
}
