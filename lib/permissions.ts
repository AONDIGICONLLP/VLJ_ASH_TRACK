import type { Permission } from "@/types";

function findPermission(permissions: Permission[] | undefined, shortCode: string): Permission | undefined {
  return permissions?.find((p) => p.shortCode === shortCode);
}

export function hasView(permissions: Permission[] | undefined, shortCode: string): boolean {
  return findPermission(permissions, shortCode)?.canView === 1;
}

export function hasAdd(permissions: Permission[] | undefined, shortCode: string): boolean {
  return findPermission(permissions, shortCode)?.canAdd === 1;
}

// For navigation/utility pages (History, More) that aren't tied to one
// resource permission — visible as long as the account can view anything.
export function hasAnyView(permissions: Permission[] | undefined): boolean {
  return !!permissions?.some((p) => p.canView === 1);
}
