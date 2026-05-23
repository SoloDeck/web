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
