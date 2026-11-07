export interface JwtPayload {
  sub: string;       // user id
  email: string;
  permissions: string[];
  isSuperAdmin: boolean;
}

export interface JwtRefreshPayload {
  sub: string;
  email: string;
}

export interface AuthTokens {
  accessToken: string;
  refreshToken: string;
}
