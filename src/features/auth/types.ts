export type User = {
  id: string;
  fullName: string;
  email: string;
  /** Optional remote avatar; when absent the UI falls back to initials. */
  avatarUrl?: string;
};

export type LoginCredentials = {
  email: string;
  password: string;
};

export type RegisterPayload = {
  fullName: string;
  email: string;
  password: string;
};

/** A JWT-style session as returned by the auth backend. */
export type AuthSession = {
  token: string;
  user: User;
};

/** Raw response shape from POST /auth/login and POST /auth/register. */
export type ApiAuthResponse = {
  access_token: string;
  refresh_token: string;
  token_type: string;
  expires_in: number;
};

/** Generic wrapper mà backend dùng cho mọi response: { success, code, data: T } */
export type ApiResponse<T> = {
  success: boolean;
  code: number;
  timestamp: string;
  data: T;
};
