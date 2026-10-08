import { getRolesApi } from "@/lib/api";
import { clearSession, getSession, setSession as persistSession } from "@/lib/storage";
import { removeToken, setToken } from "@/lib/token-service";
import type { Role, Session } from "@/types";
import { createContext, ReactNode, useContext, useEffect, useState } from "react";

// What login.tsx has right after a successful login call — everything
// except `role`, which login() below resolves from the roles list.
export type LoginSessionInput = Omit<Session, "role">;

type AuthContextValue = {
  session: Session | null;
  loading: boolean;
  login: (input: LoginSessionInput) => Promise<void>;
  logout: () => Promise<void>;
};

const AuthContext = createContext<AuthContextValue | undefined>(undefined);

// The login response only carries a numeric roleID; the roles list
// (GET /roles/) returns the actual role names in the same order, so
// roleID is treated as that list's 1-indexed position. Falls back to the
// least-privileged role if the roles list can't be loaded or roleID doesn't
// match anything recognizable — never silently grants elevated access.
function normalizeRoleName(name: string): Role {
  const lower = name.trim().toLowerCase();
  if (lower.includes("super")) return "superadmin";
  if (lower.includes("admin")) return "admin";
  return "user";
}

async function resolveRole(roleID: number): Promise<Role> {
  try {
    const roles = await getRolesApi();
    const name = roles[Number(roleID) - 1];
    return name ? normalizeRoleName(name) : "user";
  } catch {
    return "user";
  }
}

export function AuthProvider({ children }: { children: ReactNode }) {
  const [session, setSessionState] = useState<Session | null>(null);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    getSession()
      .then(async (s) => {
        if (!s) {
          setSessionState(null);
          return;
        }
        setToken(s.token);
        // Re-resolve on every boot, not just at login — corrects any role
        // that was persisted before this resolution existed (or if the
        // roles list itself changes later), without needing a re-login.
        const role = await resolveRole(s.roleID);
        const refreshed = role === s.role ? s : { ...s, role };
        if (refreshed !== s) await persistSession(refreshed);
        setSessionState(refreshed);
      })
      .finally(() => setLoading(false));
  }, []);

  async function login(input: LoginSessionInput) {
    // Set the token before resolving the role — getRolesApi() is an
    // authenticated endpoint and needs it to already be in place.
    setToken(input.token);
    const role = await resolveRole(input.roleID);
    const newSession: Session = { ...input, role };
    await persistSession(newSession);
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
