import type {
  AuthSession,
  LoginCredentials,
  RegisterPayload,
  User,
} from "@/features/auth/types";
// import axiosClient from "@/configs/axios";

// ---------------------------------------------------------------------------
// Auth service
//
// The capstone spec calls for JWT sessions + Google OAuth handled by the
// FastAPI backend. Until that exists, this module emulates the contract
// against localStorage so the full login / register / logout flow is testable.
// Every function is shaped like its eventual REST call (see commented axios
// lines); swapping to the real backend touches only this file.
//
// NOTE: the mock stores credentials in localStorage for demo purposes only.
// Real authentication never ships plaintext passwords to the client — the
// backend verifies a bcrypt hash and returns a signed JWT.
// ---------------------------------------------------------------------------

const SESSION_KEY = "solodesk.auth.session.v1";
const USERS_KEY = "solodesk.auth.users.v1";

type StoredUser = User & { password: string };

const DEMO_USER: StoredUser = {
  id: "u-demo",
  fullName: "Minh Nguyễn",
  email: "demo@solodesk.vn",
  password: "123456",
};

export const DEMO_CREDENTIALS = {
  email: DEMO_USER.email,
  password: DEMO_USER.password,
};

function readUsers(): StoredUser[] {
  try {
    const raw = localStorage.getItem(USERS_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore malformed storage */
  }
  // Seed a demo account on first run so the app is usable immediately.
  localStorage.setItem(USERS_KEY, JSON.stringify([DEMO_USER]));
  return [DEMO_USER];
}

function writeUsers(users: StoredUser[]): void {
  localStorage.setItem(USERS_KEY, JSON.stringify(users));
}

function persistSession(session: AuthSession): void {
  localStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

/** Strip the password before exposing a stored user to the app. */
function toPublicUser(stored: StoredUser): User {
  return {
    id: stored.id,
    fullName: stored.fullName,
    email: stored.email,
    avatarUrl: stored.avatarUrl,
  };
}

/** Fake a signed token. The real backend issues a proper JWT. */
function issueToken(userId: string): string {
  return `mock.${userId}.${Date.now().toString(36)}`;
}

/** The current persisted session, if any. Read synchronously at store init. */
export function getStoredSession(): AuthSession | null {
  try {
    const raw = localStorage.getItem(SESSION_KEY);
    if (raw) return JSON.parse(raw);
  } catch {
    /* ignore malformed storage */
  }
  return null;
}

export function getToken(): string | null {
  return getStoredSession()?.token ?? null;
}

/** Maps to `POST /auth/login`. */
export async function login(creds: LoginCredentials): Promise<AuthSession> {
  // return (await axiosClient.post<AuthSession>("/auth/login", creds)).data;
  const user = readUsers().find(
    (u) => u.email.toLowerCase() === creds.email.trim().toLowerCase()
  );
  if (!user || user.password !== creds.password) {
    throw new Error("Email hoặc mật khẩu không đúng.");
  }
  const session: AuthSession = { token: issueToken(user.id), user: toPublicUser(user) };
  persistSession(session);
  return session;
}

/** Maps to `POST /auth/register`. */
export async function register(payload: RegisterPayload): Promise<AuthSession> {
  // return (await axiosClient.post<AuthSession>("/auth/register", payload)).data;
  const users = readUsers();
  const email = payload.email.trim().toLowerCase();
  if (users.some((u) => u.email.toLowerCase() === email)) {
    throw new Error("Email này đã được đăng ký.");
  }
  const newUser: StoredUser = {
    id: `u-${Date.now().toString(36)}`,
    fullName: payload.fullName.trim(),
    email: payload.email.trim(),
    password: payload.password,
  };
  writeUsers([...users, newUser]);
  const session: AuthSession = { token: issueToken(newUser.id), user: toPublicUser(newUser) };
  persistSession(session);
  return session;
}

/**
 * Maps to a mock Google OAuth 2.0 exchange. The real flow redirects to
 * Google's consent screen and exchanges the code on the backend.
 */
export async function loginWithGoogle(): Promise<AuthSession> {
  const users = readUsers();
  const email = "google.user@solodesk.vn";
  let user = users.find((u) => u.email === email);
  if (!user) {
    user = {
      id: "u-google",
      fullName: "Google User",
      email,
      password: crypto.randomUUID(),
    };
    writeUsers([...users, user]);
  }
  const session: AuthSession = { token: issueToken(user.id), user: toPublicUser(user) };
  persistSession(session);
  return session;
}

/**
 * Maps to `POST /auth/forgot-password`. Always resolves successfully so the
 * response never reveals whether an email is registered; the real backend
 * emails a signed, time-limited reset link (SendGrid) when the account exists.
 */
export async function requestPasswordReset(email: string): Promise<void> {
  // await axiosClient.post("/auth/forgot-password", { email });
  void email;
}

/** Maps to `POST /auth/logout`; clears the local session either way. */
export function logout(): void {
  // axiosClient.post("/auth/logout").catch(() => {});
  localStorage.removeItem(SESSION_KEY);
}
