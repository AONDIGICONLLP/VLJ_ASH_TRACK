import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import type { Role } from "@/types";

export function useRoleGuard(allowedRoles: Role[]) {
  const { session, loading } = useAuth();
  const allowedKey = allowedRoles.join(",");

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!allowedKey.split(",").includes(session.role)) {
      router.replace("/(tabs)/vehicle-rfid");
    }
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [loading, session, allowedKey]);

  const allowed = !loading && !!session && allowedRoles.includes(session.role);
  return { allowed, loading: loading || !session };
}
