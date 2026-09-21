import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useMemo,
  useState,
  type ReactNode,
} from "react";
import type { UserRole } from "@/domain";
import { api, clearToken, getToken, setToken } from "@/core/http";
import { clearSession, readSession, writeSession, type SessionUser } from "@/core/session/session-storage";

type AuthState = {
  user: string | null;
  name: string | null;
  role: UserRole | null;
  ready: boolean;
  login: (user: string, password: string) => Promise<void>;
  logout: () => void;
};

const AuthContext = createContext<AuthState | null>(null);

function sessionFromToken(): SessionUser | null {
  if (!getToken()) return null;
  return readSession();
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSession] = useState<SessionUser | null>(() => sessionFromToken());
  const [ready, setReady] = useState(!getToken());

  useEffect(() => {
    const token = getToken();
    const cachedName = session?.name;
    if (!token) {
      setReady(true);
      return;
    }
    void api<{ user: string; role: UserRole }>("/auth/me")
      .then((me) => {
        const next = {
          user: me.user,
          role: me.role,
          name: cachedName ?? me.user,
        };
        writeSession(next);
        setSession(next);
      })
      .catch(() => {
        clearToken();
        clearSession();
        setSession(null);
      })
      .finally(() => setReady(true));
  }, []);

  const login = useCallback(async (name: string, password: string) => {
    const res = await api<{ token: string; user: string; role: UserRole; name: string }>("/auth/login", {
      method: "POST",
      body: JSON.stringify({ user: name, password }),
    });
    setToken(res.token);
    const next = { user: res.user, role: res.role, name: res.name };
    writeSession(next);
    setSession(next);
  }, []);

  const logout = useCallback(() => {
    clearToken();
    clearSession();
    setSession(null);
  }, []);

  const value = useMemo(
    () => ({
      user: session?.user ?? null,
      name: session?.name ?? null,
      role: session?.role ?? null,
      ready,
      login,
      logout,
    }),
    [session, ready, login, logout],
  );

  return <AuthContext.Provider value={value}>{children}</AuthContext.Provider>;
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth fora do provider");
  return ctx;
}
