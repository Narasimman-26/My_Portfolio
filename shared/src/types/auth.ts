export interface UserProfile {
  uid: string;
  email: string;
  username: string;
  displayName: string;
  publicKey: string; // Base64 encoded X25519 public key
  avatarUrl?: string;
  createdAt: number;
  lastSeen: number;
  isOnline: boolean;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
  expiresIn: number; // in seconds
}

export interface AuthenticatedUser {
  uid: string;
  email: string;
  username: string;
}

export interface TokenPayload {
  uid: string;
  email: string;
  username: string;
  type: 'access' | 'refresh';
  iat?: number;
  exp?: number;
}
