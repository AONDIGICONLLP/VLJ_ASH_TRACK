import { createContext, ReactNode, useContext, useEffect, useState } from "react";
import { clearSession, getSession, setSession as persistSession } from "@/lib/storage";
import { removeToken, setToken } from "@/lib/token-service";
import type { Session } from "@/types";

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  login: (session: Session) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then((s) => {
        setToken(s?.token ?? null);
        setSessionState(s);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(newSession: Session) {
    await persistSession(newSession);
    setToken(newSession.token);
    setSessionState(newSession);
  }

  async function logout() {
    await clearSession();
    removeToken();
    setSessionState(null);
  }

  return (
    <AuthContext.Provider value={{ session, loading, login, logout }}>
      {children}
    </AuthContext.Provider>
  );
}

export function useAuth() {
  const ctx = useContext(AuthContext);
  if (!ctx) throw new Error("useAuth must be used within AuthProvider");
  return ctx;
}
