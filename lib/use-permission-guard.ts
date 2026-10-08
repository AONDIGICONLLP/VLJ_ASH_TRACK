import { useEffect } from "react";
import { router } from "expo-router";
import { useAuth } from "@/lib/auth-context";
import { hasAdd, hasAnyView, hasView } from "@/lib/permissions";

// Gates a page by a specific permission shortCode's canView flag. Denied or
// unauthenticated users are bounced to History, which is itself only
// reachable with any view permission at all (see useAnyPermissionGuard) and
// falls further back to /login if even that's denied — so this never loops.
export function usePermissionGuard(shortCode: string) {
  const { session, loading } = useAuth();
  const allowed = !loading && !!session && hasView(session.permissions, shortCode);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!hasView(session.permissions, shortCode)) {
      router.replace("/(tabs)/history");
    }
  }, [loading, session, shortCode]);

  return { allowed, loading: loading || !session };
}

// For navigation/utility pages (History) not tied to one resource
// permission — visible as long as the account can view anything at all.
export function useAnyPermissionGuard() {
  const { session, loading } = useAuth();
  const allowed = !loading && !!session && hasAnyView(session.permissions);

  useEffect(() => {
    if (loading) return;
    if (!session) {
      router.replace("/login");
      return;
    }
    if (!hasAnyView(session.permissions)) {
      router.replace("/login");
    }
  }, [loading, session]);

  return { allowed, loading: loading || !session };
}

// Convenience for gating an "add" action (FAB, submit button) within an
// already-guarded page.
export function usePermission(shortCode: string) {
  const { session } = useAuth();
  return {
    canView: hasView(session?.permissions, shortCode),
    canAdd: hasAdd(session?.permissions, shortCode),
  };
}
