export interface AuthUser {
  id: string;
  email: string;
  name?: string | null;
  role: string;
  suspendedAt?: string | null;
  suspensionReason?: string | null;
}

export interface AuthPayload {
  sub: string;
  role: string;
}
