import type { UserRole } from "@/domain";

export type SessionUser = {
  user: string;
  name: string;
  role: UserRole;
};

const SESSION_KEY = "arno-tesouraria-session";

export function readSession(): SessionUser | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as SessionUser;
  } catch {
    return null;
  }
}

export function writeSession(session: SessionUser) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}
